import { useNavigate } from 'react-router-dom';

export default function AudienceChooser({ onClose }) {
  const navigate = useNavigate();

  const choose = (role) => {
    if (role === 'admin') {
      navigate('/organisations');
    } else {
      navigate('/login?role=student&mode=register');
    }
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-[16px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audience-chooser-title"
    >
      <div
        className="bg-white text-[#171d1a] rounded-[8px] w-full max-w-lg p-[24px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Be Vietnam Pro', sans-serif" }}
      >
        <div className="flex items-start justify-between mb-[8px]">
          <h3 id="audience-chooser-title" className="text-[24px] leading-[1.3] font-bold">
            Who are you?
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="material-symbols-outlined text-[#3d4943] hover:text-[#171d1a]"
            aria-label="Close"
          >
            close
          </button>
        </div>
        <p className="text-[16px] leading-[1.6] text-[#3d4943] mb-[24px]">
          Tell us who you are so we can take you to the right place.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
          <button
            type="button"
            onClick={() => choose('student')}
            className="flex flex-col items-start gap-[8px] p-[24px] rounded-[8px] border-2 border-[#bccac1] hover:border-[#1D9E75] hover:bg-[#E1F5EE] transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[#1D9E75] text-3xl" data-icon="school">school</span>
            <span className="text-[20px] leading-[1.4] font-semibold">I'm a Youth / Student</span>
            <span className="text-[14px] leading-[1.4] text-[#3d4943]">
              Find courses, mentorship and opportunities built for youth in Kakuma.
            </span>
          </button>

          <button
            type="button"
            onClick={() => choose('admin')}
            className="flex flex-col items-start gap-[8px] p-[24px] rounded-[8px] border-2 border-[#bccac1] hover:border-[#085041] hover:bg-[#eaefea] transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[#085041] text-3xl" data-icon="apartment">apartment</span>
            <span className="text-[20px] leading-[1.4] font-semibold">I'm an Organisation</span>
            <span className="text-[14px] leading-[1.4] text-[#3d4943]">
              Post opportunities, courses or mentorship and reach verified youth.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
