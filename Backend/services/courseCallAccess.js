const Application = require('../models/Application');
const CallSession = require('../models/CallSession');
const Course = require('../models/course');
const Organisation = require('../models/Organisation');
const User = require('../models/Users');

const idString = (id) => id?.toString();

const loadCallActor = async (identity) => {
  if (!identity?.id) return null;

  if (identity.role === 'organisation') {
    const organisation = await Organisation.findById(identity.id)
      .select('name role status isActive');
    if (
      !organisation ||
      !organisation.isActive ||
      organisation.status !== 'approved' ||
      organisation.role !== identity.role
    ) {
      return null;
    }

    return {
      id: organisation._id,
      role: organisation.role,
      fullName: organisation.name
    };
  }

  const user = await User.findById(identity.id)
    .select('fullName role createdByOrg isSuspended isActive');
  if (
    !user ||
    !user.isActive ||
    user.isSuspended ||
    user.role !== identity.role
  ) {
    return null;
  }

  if (['org_admin', 'staff', 'trainee'].includes(user.role)) {
    if (!user.createdByOrg) return null;
    const organisation = await Organisation.findById(user.createdByOrg)
      .select('status isActive');
    if (!organisation || !organisation.isActive || organisation.status !== 'approved') {
      return null;
    }
  }

  return {
    id: user._id,
    role: user.role,
    createdByOrg: user.createdByOrg,
    fullName: user.fullName
  };
};

const getCourseCallContext = async (session, actor) => {
  const course = await Course.findById(session.courseId)
    .select('title organisation enrolledStudents groupChatId');
  if (!course) return { course: null, canAccess: false, canEnd: false };

  const isOrgOwner = actor.role === 'organisation'
    && idString(actor.id) === idString(course.organisation);
  const isOrgTeamMember = ['org_admin', 'staff', 'trainee'].includes(actor.role)
    && idString(actor.createdByOrg) === idString(course.organisation);
  let isEnrolledStudent = false;

  if (actor.role === 'youth') {
    isEnrolledStudent = (course.enrolledStudents || [])
      .some((studentId) => idString(studentId) === idString(actor.id));

    if (!isEnrolledStudent) {
      isEnrolledStudent = Boolean(await Application.exists({
        course: course._id,
        youth: actor.id,
        $or: [
          { status: 'accepted' },
          { completionStatus: 'enrolled' }
        ]
      }));
    }
  }

  const canAccess = isOrgOwner || isOrgTeamMember || isEnrolledStudent;
  const isOrgAdmin = isOrgOwner || (
    actor.role === 'org_admin' &&
    idString(actor.createdByOrg) === idString(course.organisation)
  );
  const canEnd = isOrgAdmin || (
    idString(session.startedBy) === idString(actor.id) &&
    session.startedByModel === (actor.role === 'organisation' ? 'Organisation' : 'User')
  );

  return { course, canAccess, canEnd };
};

const findAccessibleCall = async (callSessionId, actor) => {
  const session = await CallSession.findById(callSessionId);
  if (!session) return null;

  const context = await getCourseCallContext(session, actor);
  if (!context.course || !context.canAccess) return null;

  return { session, ...context };
};

module.exports = {
  idString,
  loadCallActor,
  getCourseCallContext,
  findAccessibleCall
};
