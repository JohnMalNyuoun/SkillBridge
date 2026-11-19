import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import CourseGroupDiscussion from '../../components/common/CourseGroupDiscussion';

const CourseDiscussion = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="fh-page">
      <Navbar />
      <main className="fh-container" style={{ maxWidth: '900px' }}>
        <button type="button" onClick={() => navigate('/group-chats')}>
          Back to group chats
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontSize: '1.35rem', fontWeight: 800, marginTop: '16px' }}>
          Group Chats
        </h1>
        <CourseGroupDiscussion courseId={courseId} />
      </main>
    </div>
  );
};

export default CourseDiscussion;
