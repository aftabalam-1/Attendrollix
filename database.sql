-- ============================================================
--  Attendrollix — Database Setup
--  Compatible with: XAMPP / Laragon (MariaDB / MySQL)
--
--  INSTRUCTIONS (phpMyAdmin) — ONLY 3 STEPS:
--  1. Open phpMyAdmin → click the top-level "SQL" tab
--  2. Paste the entire contents of this file
--  3. Click "Go"
--
--  That's it! Database will be created automatically.
-- ============================================================

-- Create database if not exists and select it
CREATE DATABASE IF NOT EXISTS attendrollix
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE attendrollix;

-- Safety: drop all tables if re-running
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS colleges;
SET FOREIGN_KEY_CHECKS = 1;

-- ── Table: colleges ───────────────────────────────────────
-- Stores one record per registered college/institution.
-- The email column is used as the login identifier.
CREATE TABLE colleges (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,   -- used as login ID
  password    VARCHAR(255)  NOT NULL,           -- bcrypt hashed
  location    VARCHAR(200)  DEFAULT '',
  board       VARCHAR(200)  DEFAULT '',
  phone       VARCHAR(20)   DEFAULT '',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: courses ────────────────────────────────────────
-- Each college can have multiple courses (e.g. B.Sc, BCA).
CREATE TABLE courses (
  id           INT           AUTO_INCREMENT PRIMARY KEY,
  college_id   INT           NOT NULL,
  course_key   VARCHAR(30)   NOT NULL,          -- short code e.g. 'bsc', 'bca'
  label        VARCHAR(100)  NOT NULL,           -- display name e.g. 'B.Sc'
  color        VARCHAR(10)   DEFAULT '#3b82f6',  -- hex color for UI
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_college_course (college_id, course_key),
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: students ───────────────────────────────────────
-- Each student belongs to one college and one course.
-- A unique QR code is auto-generated when the student is added.
CREATE TABLE students (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  college_id  INT           NOT NULL,
  course_id   INT           NOT NULL,
  name        VARCHAR(150)  NOT NULL,
  roll        VARCHAR(50)   NOT NULL,
  phone       VARCHAR(20)   DEFAULT '',
  email       VARCHAR(150)  DEFAULT '',
  qr_code     VARCHAR(60)   NOT NULL UNIQUE,    -- format: QR-S{id}-XXXXXXXX
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Table: attendance ─────────────────────────────────────
-- One record per student per date. Duplicate entries are blocked
-- by the unique key on (student_id, att_date).
CREATE TABLE attendance (
  id           INT   AUTO_INCREMENT PRIMARY KEY,
  student_id   INT   NOT NULL,
  college_id   INT   NOT NULL,
  att_date     DATE  NOT NULL,
  status       ENUM('present', 'absent', 'late') NOT NULL,
  marked_time  TIME  DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_student_date (student_id, att_date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Password Reset Tokens ─────────────────────────────────
CREATE TABLE password_resets (
  college_id  INT          NOT NULL,
  token       VARCHAR(100) NOT NULL,
  expires_at  DATETIME     NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (college_id),
  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Admin college ──────────────────────────────────────────
-- Login: admin@tmv.edu / admin@123
-- IMPORTANT: After importing this SQL, visit setup.php once to set the correct password hash.
INSERT INTO colleges (name, email, password, location, board, phone)
VALUES (
  'TMV College',
  'admin@tmv.edu',
  'SETUP_PENDING',
  'Pune, Maharashtra',
  'Savitribai Phule Pune University',
  '020-12345678'
);

-- Demo courses for the demo college
SET @cid = LAST_INSERT_ID();
INSERT INTO courses (college_id, course_key, label, color) VALUES
  (@cid, 'bsc',  'B.Sc',  '#3b82f6'),
  (@cid, 'bcom', 'B.Com', '#f59e0b'),
  (@cid, 'bca',  'BCA',   '#10b981'),
  (@cid, 'ba',   'B.A',   '#ef4444'),
  (@cid, 'bba',  'BBA',   '#8b5cf6');

-- ── BCA Students (95 students) ─────────────────────────────
-- These are inserted after the demo college courses are set up.
-- @cid is already set to the demo college ID from above.
-- We get the BCA course id for that college:
SET @bca_course_id = (SELECT id FROM courses WHERE college_id = @cid AND course_key = 'bca');

INSERT INTO students (college_id, course_id, name, roll, qr_code) VALUES
  (@cid, @bca_course_id, 'Aftab Alam Mohammad Sadique', 'BCA001', 'QR-S0-BCA001'),
  (@cid, @bca_course_id, 'Abhishek Milind Choudhari', 'BCA002', 'QR-S0-BCA002'),
  (@cid, @bca_course_id, 'Aditya Bharat Navle', 'BCA003', 'QR-S0-BCA003'),
  (@cid, @bca_course_id, 'Aditya Madhukar Umekar', 'BCA004', 'QR-S0-BCA004'),
  (@cid, @bca_course_id, 'Aditya Ravindra Band', 'BCA005', 'QR-S0-BCA005'),
  (@cid, @bca_course_id, 'Aditya Sukhadeo Kambale', 'BCA006', 'QR-S0-BCA006'),
  (@cid, @bca_course_id, 'Ammar Ahemad Khan Idris Ahemad Khan', 'BCA007', 'QR-S0-BCA007'),
  (@cid, @bca_course_id, 'Aneesha Suresh Haramkar', 'BCA008', 'QR-S0-BCA008'),
  (@cid, @bca_course_id, 'Aniruddha Sudhir Ingale', 'BCA009', 'QR-S0-BCA009'),
  (@cid, @bca_course_id, 'Arham Usaid Javed Ahemad', 'BCA010', 'QR-S0-BCA010'),
  (@cid, @bca_course_id, 'Ashwini Dilip Tiwari', 'BCA011', 'QR-S0-BCA011'),
  (@cid, @bca_course_id, 'Basit Khan Aslam Khan', 'BCA012', 'QR-S0-BCA012'),
  (@cid, @bca_course_id, 'Bhavik Chandrashekhar Garghate', 'BCA013', 'QR-S0-BCA013'),
  (@cid, @bca_course_id, 'Bhavika Mohanrao Khawale', 'BCA014', 'QR-S0-BCA014'),
  (@cid, @bca_course_id, 'Bhoomi Devidas Gupta', 'BCA015', 'QR-S0-BCA015'),
  (@cid, @bca_course_id, 'Bhumika Sandiprao Behare', 'BCA016', 'QR-S0-BCA016'),
  (@cid, @bca_course_id, 'Chhaya Dinkarrao Hirve', 'BCA017', 'QR-S0-BCA017'),
  (@cid, @bca_course_id, 'Deepraj Sudhir Abhyankar', 'BCA018', 'QR-S0-BCA018'),
  (@cid, @bca_course_id, 'Devanand Ramhari Jogi', 'BCA019', 'QR-S0-BCA019'),
  (@cid, @bca_course_id, 'Dhriti Prakashrao Daware', 'BCA020', 'QR-S0-BCA020'),
  (@cid, @bca_course_id, 'Dipanshu Pankaj Girmkar', 'BCA021', 'QR-S0-BCA021'),
  (@cid, @bca_course_id, 'Divya Yashwant Varma', 'BCA022', 'QR-S0-BCA022'),
  (@cid, @bca_course_id, 'Divyani Omprakash Kharkar', 'BCA023', 'QR-S0-BCA023'),
  (@cid, @bca_course_id, 'Faez Khan Shabbir Khan', 'BCA024', 'QR-S0-BCA024'),
  (@cid, @bca_course_id, 'Gaurav Anil Nile', 'BCA025', 'QR-S0-BCA025'),
  (@cid, @bca_course_id, 'Gauri Rajesh Anasane', 'BCA026', 'QR-S0-BCA026'),
  (@cid, @bca_course_id, 'Gayatri Chandu Wankhade', 'BCA027', 'QR-S0-BCA027'),
  (@cid, @bca_course_id, 'Gayatri Sanjay Patil', 'BCA028', 'QR-S0-BCA028'),
  (@cid, @bca_course_id, 'Gunjan Vijay Dandekar', 'BCA029', 'QR-S0-BCA029'),
  (@cid, @bca_course_id, 'Harsha Sureshrao Gondhale', 'BCA030', 'QR-S0-BCA030'),
  (@cid, @bca_course_id, 'Harshali Ravindra Ubhad', 'BCA031', 'QR-S0-BCA031'),
  (@cid, @bca_course_id, 'Hitesh Gajanan Jawanjal', 'BCA032', 'QR-S0-BCA032'),
  (@cid, @bca_course_id, 'Karan Radheshyam Sawalkar', 'BCA033', 'QR-S0-BCA033'),
  (@cid, @bca_course_id, 'Khatijatul Ammara Mohd Aslam', 'BCA034', 'QR-S0-BCA034'),
  (@cid, @bca_course_id, 'Kiran Ramdas Kakde', 'BCA035', 'QR-S0-BCA035'),
  (@cid, @bca_course_id, 'Krushnakant Gajanan Dhote', 'BCA036', 'QR-S0-BCA036'),
  (@cid, @bca_course_id, 'Megha Rajesh Sonone', 'BCA037', 'QR-S0-BCA037'),
  (@cid, @bca_course_id, 'Mohammad Anas Mohammad Hatam', 'BCA038', 'QR-S0-BCA038'),
  (@cid, @bca_course_id, 'Mohammad Mujahid Ahmad Mohammad Ashfaque', 'BCA039', 'QR-S0-BCA039'),
  (@cid, @bca_course_id, 'Mohammad Mujahid Shaikh Ashpak', 'BCA040', 'QR-S0-BCA040'),
  (@cid, @bca_course_id, 'Mohammad Salman Mohammad Sadique', 'BCA041', 'QR-S0-BCA041'),
  (@cid, @bca_course_id, 'Mohd Musheer Mohd Khalid', 'BCA042', 'QR-S0-BCA042'),
  (@cid, @bca_course_id, 'Mohd Tamim Kamran Mohmmad Saleem', 'BCA043', 'QR-S0-BCA043'),
  (@cid, @bca_course_id, 'Mrunali Vinodrao Verulkar', 'BCA044', 'QR-S0-BCA044'),
  (@cid, @bca_course_id, 'Nandini Kailas Mate', 'BCA045', 'QR-S0-BCA045'),
  (@cid, @bca_course_id, 'Neharika Murlidhar Gawande', 'BCA046', 'QR-S0-BCA046'),
  (@cid, @bca_course_id, 'Nisha Narendra Dharaskar', 'BCA047', 'QR-S0-BCA047'),
  (@cid, @bca_course_id, 'Om Satishrao Ambadkar', 'BCA048', 'QR-S0-BCA048'),
  (@cid, @bca_course_id, 'Om Shyam Akhare', 'BCA049', 'QR-S0-BCA049'),
  (@cid, @bca_course_id, 'Owais Ahmad Usama Ahmad', 'BCA050', 'QR-S0-BCA050'),
  (@cid, @bca_course_id, 'Piyush Ganesh Kene', 'BCA051', 'QR-S0-BCA051'),
  (@cid, @bca_course_id, 'Piyush Pramodrao More', 'BCA052', 'QR-S0-BCA052'),
  (@cid, @bca_course_id, 'Poonam Digambar Gadekar', 'BCA053', 'QR-S0-BCA053'),
  (@cid, @bca_course_id, 'Poonam Kailash Ingale', 'BCA054', 'QR-S0-BCA054'),
  (@cid, @bca_course_id, 'Prajwal Avinash Deshmukh', 'BCA055', 'QR-S0-BCA055'),
  (@cid, @bca_course_id, 'Pranay Vilas Gade', 'BCA056', 'QR-S0-BCA056'),
  (@cid, @bca_course_id, 'Prathamesh Kailash Kadu', 'BCA057', 'QR-S0-BCA057'),
  (@cid, @bca_course_id, 'Prerana Dipak Wankhade', 'BCA058', 'QR-S0-BCA058'),
  (@cid, @bca_course_id, 'Riddhi Pramodrao Patil', 'BCA059', 'QR-S0-BCA059'),
  (@cid, @bca_course_id, 'Robin Sanjay Kase', 'BCA060', 'QR-S0-BCA060'),
  (@cid, @bca_course_id, 'Rushikesh Damodar Paturde', 'BCA061', 'QR-S0-BCA061'),
  (@cid, @bca_course_id, 'Rushikesh Dinesh Korde', 'BCA062', 'QR-S0-BCA062'),
  (@cid, @bca_course_id, 'Rutuja Vijay Hatwar', 'BCA063', 'QR-S0-BCA063'),
  (@cid, @bca_course_id, 'Sachi Satish Mohod', 'BCA064', 'QR-S0-BCA064'),
  (@cid, @bca_course_id, 'Sahili Bhimrao Borkar', 'BCA065', 'QR-S0-BCA065'),
  (@cid, @bca_course_id, 'Saim Affan Mohammad Saleem', 'BCA066', 'QR-S0-BCA066'),
  (@cid, @bca_course_id, 'Sakshi Ravindra Masane', 'BCA067', 'QR-S0-BCA067'),
  (@cid, @bca_course_id, 'Samiksha Ganeshprasad Tiwari', 'BCA068', 'QR-S0-BCA068'),
  (@cid, @bca_course_id, 'Samyak Prabhakar Katarne', 'BCA069', 'QR-S0-BCA069'),
  (@cid, @bca_course_id, 'Sanika Shridharrao Kumbhalkar', 'BCA070', 'QR-S0-BCA070'),
  (@cid, @bca_course_id, 'Sanket Arvind Patil', 'BCA071', 'QR-S0-BCA071'),
  (@cid, @bca_course_id, 'Sanskruti Dipakrao Hirve', 'BCA072', 'QR-S0-BCA072'),
  (@cid, @bca_course_id, 'Saurabh Ashokrao Gobare', 'BCA073', 'QR-S0-BCA073'),
  (@cid, @bca_course_id, 'Shaikh Adnan Shaikh Hatam', 'BCA074', 'QR-S0-BCA074'),
  (@cid, @bca_course_id, 'Shekh Ayan Shekh Ashpak', 'BCA075', 'QR-S0-BCA075'),
  (@cid, @bca_course_id, 'Shivani Raju Nikam', 'BCA076', 'QR-S0-BCA076'),
  (@cid, @bca_course_id, 'Shivani Sagar Metkar', 'BCA077', 'QR-S0-BCA077'),
  (@cid, @bca_course_id, 'Shravani Dilip Dhok', 'BCA078', 'QR-S0-BCA078'),
  (@cid, @bca_course_id, 'Shravani Ravindrarao Borkar', 'BCA079', 'QR-S0-BCA079'),
  (@cid, @bca_course_id, 'Shreya Mahendra Gethe', 'BCA080', 'QR-S0-BCA080'),
  (@cid, @bca_course_id, 'Shrutika Avinash Lonkar', 'BCA081', 'QR-S0-BCA081'),
  (@cid, @bca_course_id, 'Sneha Ravindra Waghade', 'BCA082', 'QR-S0-BCA082'),
  (@cid, @bca_course_id, 'Sneha Ravindraji Wankhade', 'BCA083', 'QR-S0-BCA083'),
  (@cid, @bca_course_id, 'Sohail Iqbal Khan', 'BCA084', 'QR-S0-BCA084'),
  (@cid, @bca_course_id, 'Swaraj Pramod Kene', 'BCA085', 'QR-S0-BCA085'),
  (@cid, @bca_course_id, 'Syed Athar Irfan Syed Akhtar', 'BCA086', 'QR-S0-BCA086'),
  (@cid, @bca_course_id, 'Tanushri Pramod Bhatkar', 'BCA087', 'QR-S0-BCA087'),
  (@cid, @bca_course_id, 'Mahak Shailesh Chavan', 'BCA088', 'QR-S0-BCA088'),
  (@cid, @bca_course_id, 'Vaibhav Ratan Kasab', 'BCA089', 'QR-S0-BCA089'),
  (@cid, @bca_course_id, 'Vaishnay Sudhakar Nage', 'BCA090', 'QR-S0-BCA090'),
  (@cid, @bca_course_id, 'Vedant Pradip Manjare', 'BCA091', 'QR-S0-BCA091'),
  (@cid, @bca_course_id, 'Yash Moreshwar Dongare', 'BCA092', 'QR-S0-BCA092'),
  (@cid, @bca_course_id, 'Yash Siddharth Tayde', 'BCA093', 'QR-S0-BCA093'),
  (@cid, @bca_course_id, 'Zaid Khalid Sheikh', 'BCA094', 'QR-S0-BCA094'),
  (@cid, @bca_course_id, 'Gauri Sunil Nawale', 'BCA095', 'QR-S0-BCA095');

-- Update QR codes to proper unique format using student IDs
UPDATE students SET qr_code = CONCAT('QR-S', id, '-', UPPER(HEX(FLOOR(RAND()*4294967295)))) WHERE qr_code LIKE 'QR-S0-BCA%';
