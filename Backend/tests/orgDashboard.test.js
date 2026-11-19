const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const Course = require('../models/course');
const GroupChat = require('../models/GroupChat');
const User = require('../models/Users');
const Organisation = require('../models/Organisation');
const {
  getOrgDashboard,
  createOrgMember,
  updateOrgMember
} = require('../controllers/organisation/dashboard');
const { isOrgApplicantReviewer } = require('../middleware/isOrgApplicantReviewer');

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('dashboard returns published courses, enrollment counts, ongoing instructors, and member counts', async () => {
  const now = new Date();
  const courses = [
    {
      title: 'Current course',
      startDate: new Date(now.getTime() - 60_000),
      endDate: new Date(now.getTime() + 60_000),
      assignedInstructor: { fullName: 'Instructor' },
      enrolledStudents: ['one', 'two']
    },
    {
      title: 'Upcoming course',
      startDate: new Date(now.getTime() + 60_000),
      endDate: new Date(now.getTime() + 120_000),
      assignedInstructor: null,
      enrolledStudents: []
    }
  ];
  const organizationId = 'organization-id';
  const originalFind = Course.find;
  const originalGroupChatFind = GroupChat.find;
  const originalCountDocuments = User.countDocuments;
  const originalUserFind = User.find;

  Course.find = (filter) => {
    assert.deepEqual(filter, { organisation: organizationId, status: 'published' });
    return {
      sort(sort) {
        assert.deepEqual(sort, { createdAt: -1 });
        return this;
      },
      populate(path, fields) {
        assert.equal(path, 'assignedInstructor');
        assert.equal(fields, 'fullName email');
        return this;
      },
      lean: async () => courses
    };
  };
  GroupChat.find = (filter) => {
    assert.deepEqual(filter, { organisation: organizationId });
    return {
      populate(path, fields) {
        assert.equal(path, 'course');
        assert.equal(fields, 'title');
        return this;
      },
      sort(sort) {
        assert.deepEqual(sort, { createdAt: -1 });
        return this;
      },
      lean: async () => [{
        _id: 'chat-id',
        course: { _id: 'current-course-id', title: 'Current course' },
        participants: ['one', 'two', 'three'],
        createdAt: now
      }]
    };
  };
  User.countDocuments = async ({ role }) => (role === 'staff' ? 3 : 5);
  User.find = (filter) => {
    assert.deepEqual(filter, {
      createdByOrg: organizationId,
      role: { $in: ['staff', 'trainee'] }
    });
    return {
      select(fields) {
        assert.equal(fields, 'fullName email role isSuspended isActive');
        return this;
      },
      sort(sort) {
        assert.deepEqual(sort, { createdAt: -1 });
        return this;
      },
      lean: async () => [{ _id: 'member-id', fullName: 'Team member', role: 'staff' }]
    };
  };

  const res = makeResponse();
  try {
    await getOrgDashboard({ organizationId }, res);
  } finally {
    Course.find = originalFind;
    GroupChat.find = originalGroupChatFind;
    User.countDocuments = originalCountDocuments;
    User.find = originalUserFind;
  }

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.publishedCourses[0].enrolledCount, 2);
  assert.equal('enrolledStudents' in res.body.data.publishedCourses[0], false);
  assert.equal(res.body.data.ongoingCourses.length, 1);
  assert.equal(res.body.data.ongoingCourses[0].assignedInstructor.fullName, 'Instructor');
  assert.equal(res.body.data.staffCount, 3);
  assert.equal(res.body.data.traineeCount, 5);
  assert.equal(res.body.data.teamMembers[0].fullName, 'Team member');
  assert.equal(res.body.data.activeGroupChats[0].name, 'Current course');
  assert.equal(res.body.data.activeGroupChats[0].participantCount, 3);
});

test('org admin creates a verified member with a hashed password and organization ownership', async () => {
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  let createdData;

  User.findOne = async () => null;
  User.create = async (data) => {
    createdData = data;
    return { ...data, _id: 'member-id', isSuspended: false };
  };

  const res = makeResponse();
  try {
    await createOrgMember({
      organizationId: 'organization-id',
      body: {
        fullName: ' New Member ',
        email: ' MEMBER@example.com ',
        password: 'secret1',
        role: 'staff'
      }
    }, res);
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.fullName, 'New Member');
  assert.equal(createdData.email, 'member@example.com');
  assert.equal(createdData.role, 'staff');
  assert.equal(createdData.createdByOrg, 'organization-id');
  assert.equal(createdData.isVerified, true);
  assert.equal(await bcrypt.compare('secret1', createdData.password), true);
});

test('org admin updates only a member belonging to their organization', async () => {
  const originalFindOne = User.findOne;
  const member = {
    _id: 'member-id',
    fullName: 'Member',
    email: 'member@example.com',
    role: 'staff',
    isSuspended: false,
    async save() {}
  };
  let query;
  User.findOne = async (filter) => {
    query = filter;
    return member;
  };

  const res = makeResponse();
  try {
    await updateOrgMember({
      organizationId: 'organization-id',
      params: { id: '0123456789abcdef01234567' },
      body: { role: 'trainee', isSuspended: true }
    }, res);
  } finally {
    User.findOne = originalFindOne;
  }

  assert.equal(query.createdByOrg, 'organization-id');
  assert.deepEqual(query.role, { $in: ['staff', 'trainee'] });
  assert.equal(member.role, 'trainee');
  assert.equal(member.isSuspended, true);
  assert.equal(res.statusCode, 200);
});

test('staff and trainees resolve to their organization for applicant review', async () => {
  const originalUserFindById = User.findById;
  const originalOrganisationFindById = Organisation.findById;
  const organisation = { _id: 'organization-id', isActive: true, status: 'approved' };

  User.findById = () => ({
    select: async () => ({
      role: 'trainee',
      createdByOrg: 'organization-id',
      isSuspended: false
    })
  });
  Organisation.findById = () => ({
    select: async () => organisation
  });

  const req = { user: { id: 'member-id', role: 'trainee' } };
  const res = makeResponse();
  let continued = false;
  try {
    await isOrgApplicantReviewer(req, res, () => {
      continued = true;
    });
  } finally {
    User.findById = originalUserFindById;
    Organisation.findById = originalOrganisationFindById;
  }

  assert.equal(continued, true);
  assert.equal(req.organizationId, 'organization-id');
});
