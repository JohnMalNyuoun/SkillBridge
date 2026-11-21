require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Story = require('../src/models/Story');
const Opportunity = require('../src/models/Opportunity');

const DEMO_TAG = '[demo]';

const STUDENTS = [
  { name: 'Amani Ouma', email: 'amani.ouma@demo.fursahub.local', program: 'ICT Bootcamp', location: 'Kakuma 1' },
  { name: 'Nyakuoth Lual', email: 'nyakuoth.lual@demo.fursahub.local', program: 'Tailoring & Design', location: 'Kakuma 3' },
  { name: 'Deng Mabior', email: 'deng.mabior@demo.fursahub.local', program: 'Solar Installation', location: 'Kalobeyei' },
  { name: 'Halima Yusuf', email: 'halima.yusuf@demo.fursahub.local', program: 'Business Studies', location: 'Kakuma 2' },
  { name: 'Peter Wani', email: 'peter.wani@demo.fursahub.local', program: 'Carpentry', location: 'Kakuma 4' },
  { name: 'Sadia Abdille', email: 'sadia.abdille@demo.fursahub.local', program: 'Nursing Assistant', location: 'Kakuma 1' },
  { name: 'Joseph Lokong', email: 'joseph.lokong@demo.fursahub.local', program: 'Graphic Design', location: 'Kalobeyei' },
  { name: 'Mary Achol', email: 'mary.achol@demo.fursahub.local', program: 'Community Health', location: 'Kakuma 2' },
  { name: 'Grace Akinyi', email: 'grace.akinyi@demo.fursahub.local', program: 'Data Entry & Admin', location: 'Kakuma 1' },
  { name: 'Ibrahim Hassan', email: 'ibrahim.hassan@demo.fursahub.local', program: 'Mobile Phone Repair', location: 'Kakuma 2' },
  { name: 'Rose Nyandeng', email: 'rose.nyandeng@demo.fursahub.local', program: 'Hairdressing & Beauty', location: 'Kakuma 3' },
  { name: 'Daniel Akol', email: 'daniel.akol@demo.fursahub.local', program: 'Welding & Metalwork', location: 'Kakuma 4' },
  { name: 'Esther Wambui', email: 'esther.wambui@demo.fursahub.local', program: 'Early Childhood Education', location: 'Kalobeyei' },
  { name: 'Mohamed Abdi', email: 'mohamed.abdi@demo.fursahub.local', program: 'English & Literacy', location: 'Kakuma 1' },
  { name: 'Lina Bashir', email: 'lina.bashir@demo.fursahub.local', program: 'Photography & Storytelling', location: 'Kakuma 2' },
  { name: 'Simon Lopeyok', email: 'simon.lopeyok@demo.fursahub.local', program: 'Agribusiness', location: 'Kalobeyei' },
  { name: 'Sarah Nyaboke', email: 'sarah.nyaboke@demo.fursahub.local', program: 'ICT Bootcamp', location: 'Kakuma 3' },
  { name: 'Yohannes Bekele', email: 'yohannes.bekele@demo.fursahub.local', program: 'Plumbing', location: 'Kakuma 4' },
  { name: 'Fatuma Omar', email: 'fatuma.omar@demo.fursahub.local', program: 'Bakery & Pastry', location: 'Kakuma 1' },
  { name: 'John Garang', email: 'john.garang@demo.fursahub.local', program: 'Digital Marketing', location: 'Kalobeyei' },
];

const ORGS = [
  { name: 'Jane Karanja', email: 'jane@brightfuture.demo.local', organization: 'Bright Future Africa' },
  { name: 'Samuel Otieno', email: 'samuel@windleorg.demo.local', organization: 'Windle International Kenya' },
  { name: 'Aisha Mohamed', email: 'aisha@dafichat.demo.local', organization: 'DAFI Scholarship Program' },
  { name: 'Eric Mwangi', email: 'eric@safaricomfoundation.demo.local', organization: 'Safaricom Foundation' },
  { name: 'Linet Atieno', email: 'linet@unhcrkakuma.demo.local', organization: 'UNHCR Kakuma' },
  { name: 'Tom Mutua', email: 'tom@andelakenya.demo.local', organization: 'Andela Kenya' },
  { name: 'Faith Wanjiru', email: 'faith@solarsisters.demo.local', organization: 'Solar Sisters East Africa' },
  { name: 'David Kiprop', email: 'david@jrskenya.demo.local', organization: 'Jesuit Refugee Service Kenya' },
  { name: 'Mercy Wanjiku', email: 'mercy@equityfoundation.demo.local', organization: 'Equity Group Foundation' },
  { name: 'Anthony Njoroge', email: 'anthony@ihub.demo.local', organization: 'iHub Nairobi' },
  { name: 'Beatrice Adhiambo', email: 'beatrice@unwomen.demo.local', organization: 'UN Women Kenya' },
  { name: 'Patrick Omondi', email: 'patrick@kepsa.demo.local', organization: 'Kenya Private Sector Alliance' },
  { name: 'Hannah Cherono', email: 'hannah@actionaid.demo.local', organization: 'ActionAid Kenya' },
  { name: 'Kevin Mutiso', email: 'kevin@moringaschool.demo.local', organization: 'Moringa School' },
  { name: 'Caroline Wairimu', email: 'caroline@kakumakitchen.demo.local', organization: 'Kakuma Kitchen Cooperative' },
  { name: 'Stephen Lokol', email: 'stephen@turkanahub.demo.local', organization: 'Turkana Innovation Hub' },
  { name: 'Rebecca Awino', email: 'rebecca@globalgiving.demo.local', organization: 'GlobalGiving East Africa' },
];

const STORIES = [
  {
    titles: [
      'My first paid web design gig — from Kakuma to Nairobi',
      'How a free coding course changed everything for me',
      'Three months of HTML & CSS, and I built my first real site',
    ],
    bodies: [
      'When I started the ICT class I had only used a phone — never a laptop. Six months later I built a landing page for a small shop in Kakuma 1 and got paid 4,000 KES. It is not much but it proved to me that this skill is real. If I can do it, you can too. Show up every day, even when WiFi fights you. Resources I used: https://www.freecodecamp.org and https://developer.mozilla.org',
      'I almost dropped the class twice. Then a mentor told me: do one small thing daily. One <div>. One commit. One question on the forum. Six months in, I am freelancing on a Kenyan tech telegram group and earning enough to support my younger brother. Do not quit week three. Week four is where it clicks.',
    ],
    tags: ['ict', 'webdev', 'freelancing', 'inspiration'],
  },
  {
    titles: [
      'From tailoring class to my own small shop',
      'I sewed my way out of waiting',
      'My grandmother taught me the stitch — the program gave me the business',
    ],
    bodies: [
      'I finished the tailoring program last August. With a small grant I bought a second-hand machine. Today I sew school uniforms for 14 children in the camp and three families in town. The trick was not the sewing — it was learning to price my work so I do not lose money. Ask your trainer about the costing class. It changed my life.',
      'For two years I waited for resettlement news that never came. Then I joined the tailoring class because a friend dragged me. Now I have customers. Waiting is heavy. Building is lighter, even when it is slow.',
    ],
    tags: ['tailoring', 'business', 'women', 'kakuma'],
  },
  {
    titles: [
      'Solar installation taught me physics and paid my school fees',
      'I now install solar kits for three NGOs',
      'How learning a trade gave me dignity',
    ],
    bodies: [
      'The solar program is short — only four months — but it pays. I now do small installations for households in Kalobeyei. Charge 1,500 KES per kit, do two a week, and you can support a family. Tools list and a cheat sheet I wrote: https://github.com/deng-solar/kakuma-solar-notes (open to all).',
      'People underestimate trade skills. A laptop is great, but a roof full of solar panels feeds children today. Both matter. Choose what fits your situation.',
    ],
    tags: ['solar', 'trade', 'energy', 'income'],
  },
  {
    titles: [
      'I got the DAFI scholarship on my third try',
      'Rejected twice — accepted on the third. Here is what I changed.',
    ],
    bodies: [
      'First two essays I wrote what I thought they wanted to hear. The third time I wrote what I actually believed: that I want to come back and teach. They picked me. Be specific. Be honest. Mention names of teachers who helped you. The application is at https://www.unhcr.org/dafi-scholarships — read every word twice.',
    ],
    tags: ['scholarship', 'university', 'dafi', 'rejection-to-acceptance'],
  },
  {
    titles: [
      'Selling mandazi after class paid for my phone',
      'Small business, big lesson: keep the books',
    ],
    bodies: [
      'I started selling mandazi outside the ICT center to fellow students. 5 KES each. In three months I bought a smartphone — which means I can now study at home when the center is closed. The business class lesson that stuck: write down every shilling in and out. Every single one.',
    ],
    tags: ['business', 'small-business', 'hustle', 'inspiration'],
  },
  {
    titles: [
      'My graphic design portfolio is now on Behance',
      'Five logos in, and an NGO hired me',
    ],
    bodies: [
      'I made five fake brand logos as practice and posted them on Behance and a Kenyan freelance group. A small NGO in Kalobeyei messaged me last month and paid 8,000 KES for a full brand kit. You do not need a client to start a portfolio. Make work. Post it. Tag it. Portfolio link in my profile.',
    ],
    tags: ['design', 'portfolio', 'freelance', 'creative'],
  },
  {
    titles: [
      'I became a community health volunteer and found my purpose',
      'From shy student to leading vaccination drives',
    ],
    bodies: [
      'I joined the community health program because the stipend was small but real. I did not expect to fall in love with it. Last month I helped coordinate a measles vaccination drive that reached 600 children. If you care about people, this work will fill you.',
    ],
    tags: ['health', 'community', 'volunteer', 'purpose'],
  },
  {
    titles: [
      'I built a wooden study desk and sold five more',
      'Carpentry: from class project to side income',
    ],
    bodies: [
      'For our final project I built a folding study desk that fits inside a tent. A teacher saw it, ordered one for her son, then five more parents asked. Now I take orders. Lesson: solve a problem you actually see around you. The market is already there.',
    ],
    tags: ['carpentry', 'product', 'maker', 'income'],
  },
  {
    titles: [
      'Do not be afraid to message strangers on LinkedIn',
      'One cold message, one mentor, one job lead',
    ],
    bodies: [
      'I wrote a short, polite LinkedIn message to a Kenyan software engineer I admired. I expected nothing. He replied. We had a 20-minute call. He introduced me to a hiring manager who later offered me a paid internship. Total cost: one polite message. Send it.',
    ],
    tags: ['networking', 'linkedin', 'career', 'mentorship'],
  },
];

const OPPORTUNITIES = [
  {
    title: 'Junior Web Developer Internship (Remote-Friendly)',
    description: 'Six-month paid internship for refugee learners with basic HTML/CSS/JavaScript skills. Mentorship from senior engineers, monthly stipend of 15,000 KES, possibility of full-time offer. Apply via https://www.andela.com/careers',
    type: 'internship',
    organization: 'Andela Kenya',
    location: 'Remote / Nairobi',
    remote: true,
    skillsRequired: ['HTML', 'CSS', 'JavaScript', 'Git'],
    tags: ['ict', 'webdev', 'internship'],
    applicationUrl: 'https://www.andela.com/careers',
    contactEmail: 'careers@andela.com',
    daysFromNow: 28,
  },
  {
    title: 'DAFI University Scholarship 2026 Intake',
    description: 'Full-tuition scholarship for refugee students at accredited Kenyan universities. Covers tuition, accommodation, books, monthly allowance. Requires KCSE grade C+ or equivalent. Read full criteria at https://www.unhcr.org/dafi-scholarships',
    type: 'scholarship',
    organization: 'DAFI Scholarship Program',
    location: 'Kenya (multiple universities)',
    remote: false,
    skillsRequired: [],
    tags: ['scholarship', 'university', 'dafi'],
    applicationUrl: 'https://www.unhcr.org/dafi-scholarships',
    contactEmail: 'dafi-kenya@unhcr.org',
    daysFromNow: 45,
  },
  {
    title: 'Solar Panel Technician Training (4 weeks)',
    description: 'Intensive hands-on training in solar PV installation, maintenance, and small-business setup. Tools and certificate provided. Stipend during training: 6,000 KES. Limited to 30 seats.',
    type: 'training',
    organization: 'Solar Sisters East Africa',
    location: 'Kakuma 1 Training Hall',
    remote: false,
    skillsRequired: ['Basic math', 'Willingness to learn'],
    tags: ['solar', 'energy', 'trade', 'training'],
    applicationUrl: 'https://www.solarsister.org',
    contactEmail: 'training@solarsister.org',
    daysFromNow: 14,
  },
  {
    title: 'Community Health Worker Stipend Program',
    description: 'Twelve-month paid placement supporting clinics in Kakuma and Kalobeyei. Monthly stipend 12,000 KES, basic medical training included, transport covered. Open to candidates 18+ with secondary school completion.',
    type: 'job',
    organization: 'UNHCR Kakuma',
    location: 'Kakuma / Kalobeyei',
    remote: false,
    skillsRequired: ['English or Swahili', 'Empathy', 'Reliability'],
    tags: ['health', 'community', 'employment'],
    applicationUrl: 'https://www.unhcr.org/ke/kakuma',
    contactEmail: 'kakuma-jobs@unhcr.org',
    daysFromNow: 21,
  },
  {
    title: 'Graphic Design & Branding Bootcamp',
    description: 'Eight-week evening bootcamp in Adobe alternatives (Figma, Canva, GIMP). Build a portfolio of five client-ready projects. Laptops provided during sessions. Free for refugee learners.',
    type: 'training',
    organization: 'Bright Future Africa',
    location: 'Kalobeyei Innovation Lab',
    remote: false,
    skillsRequired: ['Curiosity', 'Basic computer literacy'],
    tags: ['design', 'creative', 'training', 'free'],
    applicationUrl: 'https://www.brightfutureafrica.org/apply',
    contactEmail: 'apply@brightfutureafrica.org',
    daysFromNow: 10,
  },
  {
    title: 'Women in Tech Mentorship Circle',
    description: 'Six-month structured mentorship with female Kenyan tech leaders. Bi-weekly group calls, one-on-one sessions, peer support group, and a final showcase event. Priority for women in refugee communities.',
    type: 'mentorship',
    organization: 'Safaricom Foundation',
    location: 'Online (Zoom + WhatsApp)',
    remote: true,
    skillsRequired: ['Interest in tech', 'Consistent internet at least 2 hours/week'],
    tags: ['women', 'mentorship', 'tech'],
    applicationUrl: 'https://www.safaricomfoundation.org',
    contactEmail: 'wit@safaricomfoundation.org',
    daysFromNow: 35,
  },
  {
    title: 'Tailoring & Garment Production Job (Nairobi Workshop)',
    description: 'Full-time tailoring position at a fair-trade workshop in Nairobi. Salary 18,000 KES + medical cover. Relocation support available for qualified candidates from Kakuma. Two-year contract.',
    type: 'job',
    organization: 'Bright Future Africa',
    location: 'Nairobi (Eastleigh)',
    remote: false,
    skillsRequired: ['Tailoring certificate', 'One year hands-on experience'],
    tags: ['tailoring', 'employment', 'relocation'],
    applicationUrl: 'https://www.brightfutureafrica.org/jobs',
    contactEmail: 'jobs@brightfutureafrica.org',
    daysFromNow: 30,
  },
  {
    title: 'KCSE Tutoring Volunteer Coordinator',
    description: 'Part-time role coordinating evening KCSE tutoring sessions for secondary students. 15 hours/week, 8,000 KES monthly stipend. Great for university students or recent grads.',
    type: 'job',
    organization: 'Windle International Kenya',
    location: 'Kakuma 2',
    remote: false,
    skillsRequired: ['KCSE C+ in English & Math', 'Patient and organized'],
    tags: ['education', 'volunteer', 'tutoring'],
    applicationUrl: 'https://www.windle.org',
    contactEmail: 'kakuma@windle.org',
    daysFromNow: 12,
  },
  {
    title: 'Small Business Grant — Refugee Entrepreneurs (Up to 50,000 KES)',
    description: 'Micro-grants for refugee-led businesses with at least 6 months of operation. Must submit a one-page business plan and three months of simple sales records. Mentorship included for grantees.',
    type: 'other',
    organization: 'Safaricom Foundation',
    location: 'Kakuma / Kalobeyei',
    remote: false,
    skillsRequired: ['Existing business', 'Basic record-keeping'],
    tags: ['grant', 'business', 'entrepreneur'],
    applicationUrl: 'https://www.safaricomfoundation.org/grants',
    contactEmail: 'grants@safaricomfoundation.org',
    daysFromNow: 40,
  },
  {
    title: 'Data Entry Remote Job (Part-Time)',
    description: 'Part-time remote data-entry role, 20 hours/week, 10,000 KES monthly. Requires laptop or shared computer access, stable internet 3+ hours/day, and basic typing speed (25+ wpm).',
    type: 'job',
    organization: 'Andela Kenya',
    location: 'Remote',
    remote: true,
    skillsRequired: ['Typing', 'Attention to detail', 'English'],
    tags: ['remote', 'data', 'part-time'],
    applicationUrl: 'https://www.andela.com/careers',
    contactEmail: 'remote@andela.com',
    daysFromNow: 7,
  },
  {
    title: 'English Language Training (Beginner & Intermediate)',
    description: 'Free three-month English language program with focus on workplace communication. Certificate on completion. Two intakes per year — next intake starts soon.',
    type: 'training',
    organization: 'Windle International Kenya',
    location: 'Kakuma 1 & Kalobeyei',
    remote: false,
    skillsRequired: [],
    tags: ['english', 'language', 'free'],
    applicationUrl: 'https://www.windle.org/english',
    contactEmail: 'english@windle.org',
    daysFromNow: 18,
  },
  {
    title: 'Mobile Money Agent Training & Starter Kit',
    description: 'Two-week training plus a 5,000 KES starter float to begin operating as a registered M-Pesa agent. Includes branding, signage, and three months of business mentoring.',
    type: 'training',
    organization: 'Safaricom Foundation',
    location: 'Kakuma 3',
    remote: false,
    skillsRequired: ['ID document', 'Basic math', 'Trustworthy references'],
    tags: ['business', 'mobile-money', 'starter-kit'],
    applicationUrl: 'https://www.safaricomfoundation.org/mpesa-agent',
    contactEmail: 'agent@safaricomfoundation.org',
    daysFromNow: 22,
  },
  {
    title: 'Moringa School Software Engineering Scholarship',
    description: 'Full scholarship for a six-month intensive software engineering program. Covers tuition, learning materials, and a monthly stipend of 8,000 KES. Open to refugee learners with strong basics in JavaScript.',
    type: 'scholarship',
    organization: 'Moringa School',
    location: 'Nairobi (with online cohort option)',
    remote: true,
    skillsRequired: ['JavaScript basics', 'KCSE C+ or equivalent', 'Portfolio of 2+ projects'],
    tags: ['scholarship', 'ict', 'software-engineering'],
    applicationUrl: 'https://moringaschool.com/scholarships',
    contactEmail: 'admissions@moringaschool.com',
    daysFromNow: 30,
  },
  {
    title: 'Equity Wings to Fly Scholarship — University Top-Up',
    description: 'Top-up scholarship for refugee university students already enrolled. Covers accommodation, books, transport, and a monthly stipend. Apply with proof of admission and previous transcripts.',
    type: 'scholarship',
    organization: 'Equity Group Foundation',
    location: 'Kenya-wide',
    remote: false,
    skillsRequired: [],
    tags: ['scholarship', 'university', 'top-up'],
    applicationUrl: 'https://equitygroupfoundation.com/wings',
    contactEmail: 'wings@equitybank.co.ke',
    daysFromNow: 50,
  },
  {
    title: 'iHub Junior Frontend Developer (Paid Apprenticeship)',
    description: 'Twelve-month apprenticeship at iHub Nairobi. React, TypeScript, Tailwind. Pair-programming culture. Stipend 25,000 KES per month plus laptop. Refugees and Kenyans both encouraged to apply.',
    type: 'job',
    organization: 'iHub Nairobi',
    location: 'Nairobi (Kilimani)',
    remote: false,
    skillsRequired: ['HTML', 'CSS', 'JavaScript', 'React basics'],
    tags: ['ict', 'frontend', 'apprenticeship'],
    applicationUrl: 'https://ihub.co.ke/apprenticeship',
    contactEmail: 'apprentice@ihub.co.ke',
    daysFromNow: 25,
  },
  {
    title: 'UN Women — Young Women Leadership Program',
    description: 'Nine-month leadership program for young women aged 18-26. Workshops on public speaking, advocacy, project management. Includes a final group project funded up to 80,000 KES.',
    type: 'training',
    organization: 'UN Women Kenya',
    location: 'Hybrid — Nairobi residency + online sessions',
    remote: true,
    skillsRequired: ['Conversational English', 'Commitment for nine months'],
    tags: ['women', 'leadership', 'training'],
    applicationUrl: 'https://unwomen.org/ke/leadership',
    contactEmail: 'leadership@unwomen.org',
    daysFromNow: 20,
  },
  {
    title: 'KEPSA Entrepreneur Bootcamp (Free, 6 Weekends)',
    description: 'Weekend bootcamp covering business model canvas, pricing, simple bookkeeping, and pitching. Top three pitches receive a 20,000 KES seed grant each.',
    type: 'training',
    organization: 'Kenya Private Sector Alliance',
    location: 'Kakuma 1 Training Hall',
    remote: false,
    skillsRequired: ['A business idea you can describe in two sentences'],
    tags: ['business', 'entrepreneur', 'bootcamp'],
    applicationUrl: 'https://kepsa.or.ke/bootcamp',
    contactEmail: 'bootcamp@kepsa.or.ke',
    daysFromNow: 15,
  },
  {
    title: 'ActionAid — Girls Stay in School Stipend',
    description: 'Monthly stipend of 3,000 KES plus uniform and sanitary supplies for secondary-school girls in Kakuma and Kalobeyei. Application requires a recommendation from a teacher or community leader.',
    type: 'scholarship',
    organization: 'ActionAid Kenya',
    location: 'Kakuma / Kalobeyei',
    remote: false,
    skillsRequired: [],
    tags: ['girls', 'education', 'stipend'],
    applicationUrl: 'https://actionaid.or.ke/girls',
    contactEmail: 'girls@actionaid.or.ke',
    daysFromNow: 14,
  },
  {
    title: 'Turkana Innovation Hub — Maker Space Membership',
    description: 'Free six-month membership at the Turkana Innovation Hub maker space. Access to 3D printers, laser cutters, soldering stations, and weekly maker nights.',
    type: 'other',
    organization: 'Turkana Innovation Hub',
    location: 'Lodwar',
    remote: false,
    skillsRequired: ['Curiosity', 'Willingness to share what you learn'],
    tags: ['maker', 'hardware', 'community'],
    applicationUrl: 'https://turkanahub.org/membership',
    contactEmail: 'hello@turkanahub.org',
    daysFromNow: 9,
  },
  {
    title: 'Kakuma Kitchen Cooperative — Catering Trainee',
    description: 'Three-month paid trainee position at a community catering cooperative. Learn large-scale cooking, food safety, and small-business operations. 7,000 KES/month plus meals.',
    type: 'training',
    organization: 'Kakuma Kitchen Cooperative',
    location: 'Kakuma 2',
    remote: false,
    skillsRequired: ['Basic hygiene knowledge', 'Comfortable working in a kitchen'],
    tags: ['catering', 'food', 'trainee'],
    applicationUrl: 'https://kakumakitchen.org/apply',
    contactEmail: 'apply@kakumakitchen.org',
    daysFromNow: 11,
  },
  {
    title: 'Jesuit Refugee Service — Teacher Training Diploma',
    description: 'Two-year part-time teacher training diploma. Recognized by the Kenya Ministry of Education. Fee waived for refugee learners with KCSE C or above. Monthly transport stipend included.',
    type: 'scholarship',
    organization: 'Jesuit Refugee Service Kenya',
    location: 'Kakuma 4',
    remote: false,
    skillsRequired: ['KCSE C or above', 'Passion for teaching'],
    tags: ['education', 'teaching', 'diploma'],
    applicationUrl: 'https://jrs.net/kenya',
    contactEmail: 'kakuma@jrs.net',
    daysFromNow: 60,
  },
  {
    title: 'GlobalGiving Microgrant — Up to 30,000 KES',
    description: 'Quarterly microgrants for community-led initiatives. Past projects include reading corners, water-harvesting tanks, and small kitchen gardens. Apply with a one-page project plan.',
    type: 'other',
    organization: 'GlobalGiving East Africa',
    location: 'Kakuma / Kalobeyei',
    remote: false,
    skillsRequired: ['One-page project plan'],
    tags: ['grant', 'community', 'microgrant'],
    applicationUrl: 'https://globalgiving.org/ea/microgrant',
    contactEmail: 'ea@globalgiving.org',
    daysFromNow: 33,
  },
  {
    title: 'Digital Marketing Apprenticeship (TikTok & Instagram)',
    description: 'Three-month paid apprenticeship learning to manage TikTok and Instagram accounts for small businesses. Includes phone airtime, data bundle, and a small base stipend.',
    type: 'job',
    organization: 'Bright Future Africa',
    location: 'Kakuma 1 (with remote tasks)',
    remote: true,
    skillsRequired: ['Smartphone', 'Active social media account', 'Good written English or Swahili'],
    tags: ['marketing', 'social-media', 'apprenticeship'],
    applicationUrl: 'https://brightfutureafrica.org/marketing',
    contactEmail: 'marketing@brightfutureafrica.org',
    daysFromNow: 16,
  },
  {
    title: 'Refugee-Led Photo Story Contest (Cash Prizes)',
    description: 'Submit a photo series of 5-8 images telling a story about life, work, or hope in Kakuma. First prize: 30,000 KES. Second prize: 15,000 KES. Third: 8,000 KES. Open to all ages.',
    type: 'other',
    organization: 'GlobalGiving East Africa',
    location: 'Open to all',
    remote: true,
    skillsRequired: ['Camera or smartphone', 'A story to tell'],
    tags: ['photography', 'contest', 'storytelling'],
    applicationUrl: 'https://globalgiving.org/contest',
    contactEmail: 'contest@globalgiving.org',
    daysFromNow: 42,
  },
  {
    title: 'UNHCR Volunteer Translator (Arabic/Swahili/English)',
    description: 'Part-time volunteer translator for community awareness sessions. 12 hours per week, transport reimbursement, and a UNHCR certificate of service on completion.',
    type: 'other',
    organization: 'UNHCR Kakuma',
    location: 'Kakuma 1 & 2',
    remote: false,
    skillsRequired: ['Fluency in two of: Arabic, Swahili, English'],
    tags: ['volunteer', 'translation', 'community'],
    applicationUrl: 'https://unhcr.org/ke/volunteer',
    contactEmail: 'kakuma-volunteer@unhcr.org',
    daysFromNow: 8,
  },
];

// Per-student inspiration posts — guarantees every student has several posts on their profile.
// Keyed by the student email (case-insensitive). Each entry is a post {title, body, tags}.
const PERSONAL_INSPIRATIONS = {
  'amani.ouma@demo.fursahub.local': [
    { title: 'Day 1 of 100: I touched a laptop', body: 'Today I opened VS Code for the first time. The cursor blinked at me like it knew I was lost. I wrote <h1>Hello Kakuma</h1> and refreshed the browser. Nothing has ever felt so big.', tags: ['ict', 'beginnings', '100daysofcode'] },
    { title: 'I shipped my first form today', body: 'A small contact form for our class project. It validates the email and shows a green check when it sends. I am tired. I am proud. Sleep well, fellow learners.', tags: ['ict', 'webdev', 'progress'] },
    { title: 'A senior dev replied to my question', body: 'I asked a question on the Kenya Devs telegram about why my flexbox would not center. Three people replied within an hour. One was a real senior engineer at Safaricom. Ask the question. Ask the question.', tags: ['community', 'mentorship', 'ict'] },
  ],
  'nyakuoth.lual@demo.fursahub.local': [
    { title: 'My first school-uniform order — 14 pieces', body: 'A mother in Kakuma 1 ordered 14 uniforms for the children she takes care of. I worked for ten days. I delivered yesterday. She paid me in cash and gave me a hug.', tags: ['tailoring', 'business', 'milestone'] },
    { title: 'Pricing is a skill too', body: 'In class I learned: charge for fabric + thread + zipper + your time + a small margin. Most beginners forget the time. Do not forget the time.', tags: ['business', 'tailoring', 'lessons'] },
    { title: 'I am training another girl now', body: 'A 17-year-old from my block asked if she could watch me work. I said yes. Three weeks later she made her first skirt. Teach what you know, even when you feel like you know little.', tags: ['mentorship', 'women', 'inspiration'] },
  ],
  'deng.mabior@demo.fursahub.local': [
    { title: 'Two kits this week — 3,000 KES', body: 'Installed two solar home kits in Kalobeyei this week. Earned 3,000 KES. Bought airtime, school books for my sister, and saved 1,200 for the toolbox I have been eyeing.', tags: ['solar', 'income', 'progress'] },
    { title: 'How I diagnose a dead panel in 60 seconds', body: 'Step 1: check the cables. Step 2: check the cables. Step 3: actually check the panel. In four months 80 percent of the calls I get are loose cables.', tags: ['solar', 'tips', 'trade'] },
  ],
  'halima.yusuf@demo.fursahub.local': [
    { title: 'I opened a savings book', body: 'For the first time in my life I have a savings book at the cooperative. Deposited 800 KES from my mandazi sales. It is a small number but it has my name on it.', tags: ['business', 'savings', 'women'] },
    { title: 'My customers became my friends', body: 'I started selling tea outside the ICT center. Now I know the names of 30 students. They tell me when their exams are. We celebrate when they pass. Business is people.', tags: ['business', 'community', 'inspiration'] },
    { title: 'Bookkeeping for people who hate math', body: 'I made a one-page sheet: Date / In / Out / Why. That is it. Four columns. It changed how I think about money.', tags: ['business', 'tips', 'skills'] },
  ],
  'peter.wani@demo.fursahub.local': [
    { title: 'Six folding study desks, six happy families', body: 'Delivered the last of six folding study desks today. Each fits inside a tent. Each costs 1,200 KES. Every child who sits at one studies a little longer at night.', tags: ['carpentry', 'product', 'community'] },
    { title: 'Measure twice, cut once — and then measure again', body: 'I wasted a full plank last month because I trusted my eye. Now I measure twice and ask a classmate to check before I cut. Pride is expensive.', tags: ['carpentry', 'lessons', 'skills'] },
  ],
  'sadia.abdille@demo.fursahub.local': [
    { title: 'My first patient said thank you', body: 'In my second week at the clinic an elderly woman held my hand after I helped clean a wound. She said thank you in three languages. I will remember that for a long time.', tags: ['health', 'service', 'inspiration'] },
    { title: 'Notes from my first vaccination drive', body: 'Six hundred children, four nurses, two tables, one chaotic but joyful afternoon. Lessons: bring more pens than you think, and always say the childs name out loud before the shot.', tags: ['health', 'community', 'tips'] },
  ],
  'joseph.lokong@demo.fursahub.local': [
    { title: 'Five fake logos got me one real client', body: 'I made five logos for businesses that do not exist and put them on Behance. Two months later a real NGO paid me 8,000 KES for a brand kit. Make the work first. The clients come second.', tags: ['design', 'portfolio', 'freelance'] },
    { title: 'Figma over Photoshop, every day', body: 'Photoshop is heavy and I do not have a license. Figma is free and runs in the browser. Use what you have. Ship what you make.', tags: ['design', 'tools', 'tips'] },
    { title: 'A logo is a promise', body: 'My mentor told me: a logo is a promise the brand makes to its customer. Make sure you understand the promise before you draw the shape.', tags: ['design', 'creative', 'mentorship'] },
  ],
  'mary.achol@demo.fursahub.local': [
    { title: 'From shy in the back row to leading the meeting', body: 'A year ago I would not raise my hand in class. Today I led a planning meeting for 12 community volunteers. Confidence is built one small word at a time.', tags: ['leadership', 'community', 'growth'] },
    { title: 'Door-to-door health visits, lesson 1', body: 'Smile first. Greet the elder by name. Ask about the children before you ask about the illness. Information is a relationship, not a transaction.', tags: ['health', 'community', 'tips'] },
  ],
  'grace.akinyi@demo.fursahub.local': [
    { title: 'I typed my way to a part-time job', body: 'I practiced typing every day on a borrowed laptop for two months. I went from 18 wpm to 42 wpm. Last week I got a part-time data-entry job that pays 10,000 KES a month.', tags: ['skills', 'remote-work', 'inspiration'] },
    { title: 'A clean spreadsheet is a kind spreadsheet', body: 'When you label your columns clearly and freeze the header row, you save the next person an hour of confusion. Be kind to the next person.', tags: ['skills', 'tips', 'work'] },
  ],
  'ibrahim.hassan@demo.fursahub.local': [
    { title: 'I fixed 23 phones this month', body: 'Most were cracked screens, six were charging ports, two were dead batteries. Average ticket: 600 KES. The phone repair business is alive and well in Kakuma.', tags: ['repair', 'business', 'income'] },
    { title: 'YouTube taught me what school could not', body: 'My trainer gave me the basics. YouTube gave me the rest. The repair tutorials in Hindi are the best — turn on auto-translate.', tags: ['learning', 'self-taught', 'tips'] },
  ],
  'rose.nyandeng@demo.fursahub.local': [
    { title: 'My little salon under a tree', body: 'I started doing braids under a neem tree because I had no shop. Twelve regular customers later, I am saving for a small kiosk with a mirror and a chair.', tags: ['beauty', 'business', 'women'] },
    { title: 'When a customer cries in your chair', body: 'A young mother cried while I braided her hair. She had not done anything for herself in two years. Sometimes the work is not about the hair.', tags: ['service', 'women', 'inspiration'] },
  ],
  'daniel.akol@demo.fursahub.local': [
    { title: 'My first welded gate', body: 'It is not perfect — the bottom hinge is slightly crooked — but it stands, it swings, and the customer paid. I am learning that done is better than perfect.', tags: ['welding', 'trade', 'milestone'] },
    { title: 'Safety glasses save eyes', body: 'I saw a sparks-in-the-eye accident in week one of training. Now I would not strike an arc without my glasses on. Please, fellow welders, wear the glasses.', tags: ['welding', 'safety', 'tips'] },
  ],
  'esther.wambui@demo.fursahub.local': [
    { title: '32 little humans, one classroom, infinite patience', body: 'I now run a preschool class of 32 children in Kalobeyei. Some have never seen crayons. Watching them discover colors for the first time is the best part of my day.', tags: ['education', 'children', 'inspiration'] },
    { title: 'Songs are lesson plans in disguise', body: 'I teach the alphabet through a clapping song. They learn faster. I get hoarse faster. Worth it.', tags: ['education', 'tips', 'teaching'] },
  ],
  'mohamed.abdi@demo.fursahub.local': [
    { title: 'From not reading English to reading the news', body: 'Six months ago I could only write my name in English. Today I read a full BBC article and understood most of it. The free English class at Windle changed my life.', tags: ['english', 'literacy', 'inspiration'] },
  ],
  'lina.bashir@demo.fursahub.local': [
    { title: 'A photo can carry a whole story', body: 'I took a portrait of an elderly woman selling tomatoes at the market. She had not been photographed in 30 years. She cried when I printed it for her.', tags: ['photography', 'storytelling', 'community'] },
    { title: 'My first paid wedding shoot', body: 'A neighbor asked me to shoot her sisters wedding because the proper photographer cancelled. I was terrified. I delivered 200 photos. They paid me 5,000 KES and a plate of pilau.', tags: ['photography', 'freelance', 'milestone'] },
  ],
  'simon.lopeyok@demo.fursahub.local': [
    { title: 'My first harvest of sukuma wiki', body: 'I planted sukuma wiki on a 4-meter strip behind our shelter. Harvested 8 kgs in week one. Sold half, ate the rest. Soil is patient and it pays back.', tags: ['agriculture', 'business', 'inspiration'] },
  ],
  'sarah.nyaboke@demo.fursahub.local': [
    { title: 'I built a small website for my fathers shop', body: 'It has one page, three photos, and the WhatsApp button. He is the proudest man in Kakuma 3 right now. Sometimes the smallest projects matter the most.', tags: ['ict', 'webdev', 'family'] },
    { title: 'Git is hard until it isnt', body: 'Three weeks of confusion. One good explanation from a classmate. Now I cannot imagine working without branches. Stick with it.', tags: ['ict', 'git', 'learning'] },
  ],
  'yohannes.bekele@demo.fursahub.local': [
    { title: 'I fixed a leaking water tank for the clinic — for free', body: 'I told the clinic I would do it for practice. They said yes. It held all night. They asked me to fix the staff washroom next, and they paid me this time.', tags: ['plumbing', 'service', 'trade'] },
  ],
  'fatuma.omar@demo.fursahub.local': [
    { title: 'My mandazi outsold the shop downstairs', body: 'I started selling sweet mandazi at the school gate at 6 a.m. The shop downstairs sells theirs at 9 a.m. for the same price. Show up earlier than your competition.', tags: ['business', 'baking', 'lessons'] },
    { title: 'A simple recipe that changed my margins', body: 'I switched from sunflower oil to a cheaper local oil and the taste did not change. My profit per mandazi doubled. Test your supply chain.', tags: ['business', 'tips', 'baking'] },
  ],
  'john.garang@demo.fursahub.local': [
    { title: 'One TikTok got our cooperative 400 orders', body: 'I posted a 30-second video of our cooperatives soap-making process. It got 18,000 views and 400 order inquiries in a week. Cameras are quiet, but they are loud.', tags: ['marketing', 'social', 'inspiration'] },
    { title: 'Captions matter more than filters', body: 'Spend ten minutes on the caption. Ask: would I stop scrolling to read this? If not, rewrite it. Then post.', tags: ['marketing', 'tips', 'social'] },
  ],
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function ensureUser({ name, email, role, organization, program, location }) {
  let user = await User.findOne({ email });
  if (user) return user;
  user = new User({
    name,
    email,
    role,
    organization,
    profile: { program, location },
    emailVerified: true,
  });
  await user.setPassword('demo1234');
  await user.save();
  return user;
}

async function run() {
  await connectDB();
  console.log('[seed] connected');

  const studentDocs = [];
  for (const s of STUDENTS) {
    const u = await ensureUser({ ...s, role: 'student' });
    studentDocs.push(u);
  }
  console.log(`[seed] students ready: ${studentDocs.length}`);

  const orgDocs = [];
  for (const o of ORGS) {
    const u = await ensureUser({ ...o, role: 'admin' });
    orgDocs.push(u);
  }
  console.log(`[seed] organizations ready: ${orgDocs.length}`);

  let storiesCreated = 0;
  for (const tpl of STORIES) {
    for (const body of tpl.bodies) {
      const author = pick(studentDocs);
      const title = pick(tpl.titles);
      const exists = await Story.findOne({ author: author._id, title });
      if (exists) continue;
      await Story.create({
        author: author._id,
        title,
        body: `${body}

${DEMO_TAG}`,
        tags: tpl.tags,
        status: 'published',
        visibility: Math.random() < 0.15 ? 'followers' : 'public',
        likes: [],
        likesCount: Math.floor(Math.random() * 25),
        commentsCount: 0,
      });
      storiesCreated += 1;
    }
  }
  console.log(`[seed] stories created (templated): ${storiesCreated}`);

  // Per-student personal inspiration posts (guarantees each student has multiple posts).
  let personalCreated = 0;
  for (const student of studentDocs) {
    const posts = PERSONAL_INSPIRATIONS[student.email.toLowerCase()] || [];
    for (const p of posts) {
      const exists = await Story.findOne({ author: student._id, title: p.title });
      if (exists) continue;
      await Story.create({
        author: student._id,
        title: p.title,
        body: `${p.body}

${DEMO_TAG}`,
        tags: p.tags,
        status: 'published',
        visibility: Math.random() < 0.1 ? 'followers' : 'public',
        likes: [],
        likesCount: Math.floor(Math.random() * 40),
        commentsCount: 0,
      });
      personalCreated += 1;
    }
  }
  console.log(`[seed] personal inspiration posts created: ${personalCreated}`);

  let oppsCreated = 0;
  for (const o of OPPORTUNITIES) {
    const poster = orgDocs.find((u) => u.organization === o.organization) || pick(orgDocs);
    const exists = await Opportunity.findOne({ title: o.title, organization: o.organization });
    if (exists) continue;
    await Opportunity.create({
      title: o.title,
      description: `${o.description}

${DEMO_TAG}`,
      type: o.type,
      organization: o.organization,
      location: o.location,
      remote: o.remote,
      skillsRequired: o.skillsRequired,
      tags: o.tags,
      applicationUrl: o.applicationUrl,
      contactEmail: o.contactEmail,
      deadline: new Date(Date.now() + o.daysFromNow * 86400000),
      postedBy: poster._id,
      status: 'published',
      visibility: o.visibility || 'public',
    });
    oppsCreated += 1;
  }
  console.log(`[seed] opportunities created: ${oppsCreated}`);

  await mongoose.connection.close();
  console.log('[seed] done');
}

async function clean() {
  await connectDB();
  console.log('[seed] cleaning demo data...');
  const demoEmails = [...STUDENTS, ...ORGS].map((u) => u.email);
  const users = await User.find({ email: { $in: demoEmails } }, '_id');
  const ids = users.map((u) => u._id);
  const s = await Story.deleteMany({ author: { $in: ids } });
  const o = await Opportunity.deleteMany({ postedBy: { $in: ids } });
  const u = await User.deleteMany({ email: { $in: demoEmails } });
  console.log(`[seed] removed: ${s.deletedCount} stories, ${o.deletedCount} opportunities, ${u.deletedCount} users`);
  await mongoose.connection.close();
}

const cmd = process.argv[2] || 'seed';
(cmd === 'clean' ? clean() : run()).catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
