-- Seed 21 skills. Conflict key is (category, name) per DBML unique index.
INSERT INTO performance.skills (category, name, description) VALUES
  ('TECHNICAL',      'System Design',                 'Ability to design scalable and maintainable systems'),
  ('TECHNICAL',      'Data Structures & Algorithms',  'Proficiency in core data structures and algorithmic problem-solving'),
  ('TECHNICAL',      'Object-Oriented Programming',   'Understanding and application of OOP principles'),
  ('TECHNICAL',      'Database Design',               'Relational and non-relational database design skills'),
  ('TECHNICAL',      'REST APIs',                     'Design and implementation of RESTful web services'),
  ('TECHNICAL',      'Cloud Architecture',            'Knowledge of cloud platforms and architecture patterns'),
  ('TECHNICAL',      'Problem Solving',               'Structured approach to identifying and solving technical problems'),
  ('COMMUNICATION',  'Fluency',                       'Ability to speak smoothly and naturally without hesitation'),
  ('COMMUNICATION',  'Clarity',                       'Clear and concise expression of ideas'),
  ('COMMUNICATION',  'Confidence',                    'Projecting self-assurance when speaking'),
  ('COMMUNICATION',  'Active Listening',              'Demonstrating attentiveness and comprehension during conversations'),
  ('COMMUNICATION',  'Pace Control',                  'Speaking at an appropriate and consistent pace'),
  ('COMMUNICATION',  'Filler Word Avoidance',         'Minimizing use of um, uh, like, and similar filler words'),
  ('BEHAVIORAL',     'Teamwork',                      'Ability to collaborate effectively with others'),
  ('BEHAVIORAL',     'Leadership',                    'Demonstrating initiative and guiding others toward goals'),
  ('BEHAVIORAL',     'Time Management',               'Planning and organizing tasks to meet deadlines'),
  ('BEHAVIORAL',     'Adaptability',                  'Adjusting effectively to changing circumstances and requirements'),
  ('BEHAVIORAL',     'Conflict Resolution',           'Managing and resolving disagreements constructively'),
  ('DOMAIN_SPECIFIC','Data Science',                  'Knowledge of data analysis, machine learning, and statistical methods'),
  ('DOMAIN_SPECIFIC','Web Development',               'Frontend and backend web development skills'),
  ('DOMAIN_SPECIFIC','Mobile Development',            'Native and cross-platform mobile application development')
ON CONFLICT (category, name) DO NOTHING;
