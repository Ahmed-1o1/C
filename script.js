/* =========================================================
   GPA Calculator — Faculty of Specific Education, Ain Shams University
   script.js  |  i18n · Theme · GPA Logic · LocalStorage · UI
   ========================================================= */

'use strict';

/* =============================================
   1. CONSTANTS & TRANSLATIONS
   ============================================= */

/**
 * GPA conversion table — ordered from highest to lowest.
 * Each entry: [minScore (inclusive), gpaPoints, letterGrade]
 */
const GPA_TABLE = [
  [95, 4.0, 'A+'],
  [90, 3.7, 'A'],
  [85, 3.4, 'B+'],
  [80, 3.1, 'B'],
  [75, 2.8, 'C+'],
  [70, 2.5, 'C'],
  [65, 2.2, 'D+'],
  [60, 1.9, 'D'],
  [0, 0.0, 'F'],
];

/**
 * Map a numeric grade (0–100) to { points, letter }.
 * @param {number} score - Grade from 0 to 100
 * @returns {{ points: number, letter: string }}
 */
function gradeToGPA(score) {
  for (const [min, pts, letter] of GPA_TABLE) {
    if (score >= min) return { points: pts, letter };
  }
  return { points: 0.0, letter: 'F' };
}

/**
 * Convert a computed GPA number back to a letter grade.
 * @param {number} gpa
 * @returns {string} letter grade
 */
 function gpaToLetter(gpa) {
  if (gpa >= 3.7 && gpa <= 4.0) return 'A+';
  if (gpa >= 3.4 && gpa < 3.7) return 'A';
  if (gpa >= 3.1 && gpa < 3.4) return 'B+';
  if (gpa >= 2.8 && gpa < 3.1) return 'B';
  if (gpa >= 2.5 && gpa < 2.8) return 'C+';
  if (gpa >= 2.2 && gpa < 2.5) return 'C';
  if (gpa >= 1.9 && gpa < 2.2) return 'D+';
  if (gpa >= 1.6 && gpa < 1.9) return 'D';
  return 'F';
 }

/* i18n strings */
const STRINGS = {
  ar: {
    added: 'تمت إضافة مقرر جديد',
    calcSuccess: 'تم الحساب بنجاح',
    saved: 'تم حفظ الفصل في السجل',
    deleted: 'تم حذف الفصل',
    edited: 'تم تعديل بيانات الفصل',
    reset: 'تم حذف جميع البيانات',
    dupWarn: 'هذا الفصل محفوظ مسبقاً. سيتم تحديث المعدل.',
    yearNames: ['السنة الأولى', 'السنة الثانية', 'السنة الثالثة', 'السنة الرابعة'],
    semNames: ['الفصل الأول', 'الفصل الثاني'],
    errYear: 'يرجى اختيار السنة الدراسية',
    errSem: 'يرجى اختيار الفصل الدراسي',
    errNoCourses: 'أضف مقرراً واحداً على الأقل',
    errCourseName: 'يرجى إدخال اسم المقرر في جميع الصفوف',
    errCreditHours: 'يرجى إدخال ساعات معتمدة صحيحة (1–12)',
    errGrade: 'يرجى إدخال درجة صحيحة (0–100)',
    errAllZero: 'لا يمكن أن تكون جميع الساعات المعتمدة صفراً',
    editGPAErr: 'يرجى إدخال معدل صحيح بين 0.000 و 4.000',
    editHoursErr: 'يرجى إدخال عدد ساعات صحيح (1–40)',
    coursePlaceholder: 'اسم المقرر...',
    hoursPlaceholder: 'ساعات',
    gradePlaceholder: 'الدرجة',
  },
  en: {
    added: 'New course added',
    calcSuccess: 'Calculated successfully',
    saved: 'Semester saved to history',
    deleted: 'Semester deleted',
    edited: 'Semester updated',
    reset: 'All data has been reset',
    dupWarn: 'This semester was already saved. GPA will be updated.',
    yearNames: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
    semNames: ['First Semester', 'Second Semester'],
    errYear: 'Please select the academic year',
    errSem: 'Please select the semester',
    errNoCourses: 'Add at least one course',
    errCourseName: 'Please enter course names in all rows',
    errCreditHours: 'Enter valid credit hours (1–12) for all courses',
    errGrade: 'Enter a valid grade (0–100) for all courses',
    errAllZero: 'Credit hours cannot all be zero',
    editGPAErr: 'Enter a valid GPA between 0.000 and 4.000',
    editHoursErr: 'Enter valid credit hours (1–40)',
    coursePlaceholder: 'Course name...',
    hoursPlaceholder: 'Hours',
    gradePlaceholder: 'Grade',
  }
};

/* =============================================
   2. STATE
   ============================================= */
const state = {
  lang: 'ar',
  theme: 'light',
  history: [],        // Array of { year, semester, gpa, hours, qualityPoints }
  lastResult: null,   // { gpa, letter, hours, year, semester }
  deleteTarget: null, // Index for pending delete
  courseCount: 0,
};

/* =============================================
   3. DOM REFERENCES
   ============================================= */
const $ = id => document.getElementById(id);

const DOM = {
  body: document.body,
  html: document.documentElement,

  langToggle:  $('langToggle'),
  langLabel:   $('langLabel'),
  themeToggle: $('themeToggle'),
  themeIcon:   $('themeIcon'),

  academicYear: $('academicYear'),
  semester:     $('semester'),
  coursesList:  $('coursesList'),
  addCourseBtn: $('addCourseBtn'),
  clearFormBtn: $('clearFormBtn'),
  calculateBtn: $('calculateBtn'),

  errorMsg:  $('errorMsg'),
  errorText: $('errorText'),

  resultsSection: $('resultsSection'),
  semGPA:    $('semGPA'),
  semGrade:  $('semGrade'),
  semLetter: $('semLetter'),
  semHours:  $('semHours'),
  gpaBarFill: $('gpaBarFill'),
  saveSemesterBtn: $('saveSemesterBtn'),

  cgpaSection:  $('cgpaSection'),
  cgpaEmpty:    $('cgpaEmpty'),
  cgpaDisplay:  $('cgpaDisplay'),
  cgpaValue:    $('cgpaValue'),
  cgpaGrade:    $('cgpaGrade'),
  cgpaRingFill: $('cgpaRingFill'),
  cgpaTotalHours: $('cgpaTotalHours'),
  cgpaSemCount:   $('cgpaSemCount'),

  historyEmpty:        $('historyEmpty'),
  historyTableWrapper: $('historyTableWrapper'),
  historyBody:         $('historyBody'),
  resetAllBtn:         $('resetAllBtn'),

  toggleGradeRef:  $('toggleGradeRef'),
  gradeChevron:    $('gradeChevron'),
  gradeRefContent: $('gradeRefContent'),

  editModal:       $('editModal'),
  closeEditModal:  $('closeEditModal'),
  editIndex:       $('editIndex'),
  editGPA:         $('editGPA'),
  editHours:       $('editHours'),
  cancelEdit:      $('cancelEdit'),
  confirmEdit:     $('confirmEdit'),

  deleteModal:      $('deleteModal'),
  closeDeleteModal: $('closeDeleteModal'),
  cancelDelete:     $('cancelDelete'),
  confirmDelete:    $('confirmDelete'),

  resetModal:      $('resetModal'),
  closeResetModal: $('closeResetModal'),
  cancelReset:     $('cancelReset'),
  confirmReset:    $('confirmReset'),

  toastContainer: $('toastContainer'),
};

/* =============================================
   4. LANGUAGE (i18n)
   ============================================= */
function detectLang() {
  const saved = localStorage.getItem('gpa_lang');
  if (saved === 'ar' || saved === 'en') return saved;
  const browser = (navigator.language || navigator.userLanguage || 'ar').toLowerCase();
  return browser.startsWith('ar') ? 'ar' : 'en';
}

function applyLang(lang) {
  state.lang = lang;
  DOM.html.setAttribute('lang', lang);
  DOM.html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  DOM.body.setAttribute('data-lang', lang);
  DOM.langLabel.textContent = lang === 'ar' ? 'EN' : 'عر';
  localStorage.setItem('gpa_lang', lang);

  /* Update all elements with data-ar / data-en attributes */
  document.querySelectorAll('[data-ar][data-en]').forEach(el => {
    const text = el.getAttribute(`data-${lang}`);
    if (text !== null) {
      if (el.tagName === 'OPTION') {
        el.textContent = text;
      } else if (el.tagName === 'BUTTON') {
        /* don't touch buttons directly — they hold children */
      } else {
        el.textContent = text;
      }
    }
  });

  /* Also update placeholder text in course inputs */
  updateCoursePlaceholders();

  /* Re-render history table text (year/sem labels) */
  renderHistory();
}

function updateCoursePlaceholders() {
  const s = STRINGS[state.lang];
  document.querySelectorAll('.course-name-input').forEach(el => {
    el.placeholder = s.coursePlaceholder;
  });
  document.querySelectorAll('.course-hours-input').forEach(el => {
    el.placeholder = s.hoursPlaceholder;
  });
  document.querySelectorAll('.course-grade-input').forEach(el => {
    el.placeholder = s.gradePlaceholder;
  });
}

/* =============================================
   5. THEME
   ============================================= */
function detectTheme() {
  const saved = localStorage.getItem('gpa_theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  state.theme = theme;
  DOM.html.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  DOM.themeIcon.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  localStorage.setItem('gpa_theme', theme);
}

/* =============================================
   6. COURSE ROW MANAGEMENT
   ============================================= */
function createCourseRow() {
  const s = STRINGS[state.lang];
  state.courseCount++;
  const id = state.courseCount;

  const row = document.createElement('div');
  row.classList.add('course-row');
  row.dataset.id = id;

  row.innerHTML = `
    <input
      type="text"
      class="form-input course-name-input"
      placeholder="${s.coursePlaceholder}"
      maxlength="80"
      aria-label="Course name"
    />
    <input
      type="number"
      class="form-input course-hours-input"
      placeholder="${s.hoursPlaceholder}"
      min="0"
      max="12"
      step="1"
      inputmode="numeric"
      aria-label="Credit hours"
    />
    <input
      type="number"
      class="form-input course-grade-input"
      placeholder="${s.gradePlaceholder}"
      min="0"
      max="100"
      step="0.1"
      inputmode="decimal"
      aria-label="Grade"
    />
    <button class="delete-course-btn" title="Delete course" aria-label="Delete course">
      <i class="fa-solid fa-trash-can"></i>
    </button>
  `;

  /* Delete button */
  row.querySelector('.delete-course-btn').addEventListener('click', () => {
    row.style.opacity = '0';
    row.style.transform = 'translateY(-8px)';
    row.style.transition = 'opacity 0.2s, transform 0.2s';
    setTimeout(() => row.remove(), 210);
  });

  /* Grade validation — clamp on blur */
  const gradeInput = row.querySelector('.course-grade-input');
  gradeInput.addEventListener('blur', () => {
    const v = parseFloat(gradeInput.value);
    if (!isNaN(v)) {
      if (v < 0)   gradeInput.value = 0;
      if (v > 100) gradeInput.value = 100;
    }
  });

  const hoursInput = row.querySelector('.course-hours-input');
  hoursInput.addEventListener('blur', () => {
    const v = parseFloat(hoursInput.value);
    if (!isNaN(v)) {
      if (v < 0)  hoursInput.value = 0;
      if (v > 12) hoursInput.value = 12;
    }
  });

  return row;
}

function addCourse() {
  const row = createCourseRow();
  DOM.coursesList.appendChild(row);
  /* Focus the name input */
  requestAnimationFrame(() => {
    row.querySelector('.course-name-input').focus();
  });
  showToast(STRINGS[state.lang].added, 'info');
}

function clearForm() {
  DOM.coursesList.innerHTML = '';
  DOM.academicYear.value = '';
  DOM.semester.value = '';
  hideError();
  DOM.resultsSection.classList.add('hidden');
  state.lastResult = null;
  /* Add fresh initial course */
  DOM.coursesList.appendChild(createCourseRow());
}

/* =============================================
   7. VALIDATION
   ============================================= */
function getValidatedCourses() {
  const rows = DOM.coursesList.querySelectorAll('.course-row');
  if (rows.length === 0) {
    return { error: STRINGS[state.lang].errNoCourses };
  }

  const courses = [];
  for (const row of rows) {
    const name  = row.querySelector('.course-name-input').value.trim();
    const hours = parseFloat(row.querySelector('.course-hours-input').value);
    const grade = parseFloat(row.querySelector('.course-grade-input').value);

    if (!name) {
      highlightInput(row.querySelector('.course-name-input'));
      return { error: STRINGS[state.lang].errCourseName };
    }
    if (isNaN(hours) || hours < 0 || hours > 12 || !Number.isFinite(hours)) {
      highlightInput(row.querySelector('.course-hours-input'));
      return { error: STRINGS[state.lang].errCreditHours };
    }
    if (isNaN(grade) || grade < 0 || grade > 100 || !Number.isFinite(grade)) {
      highlightInput(row.querySelector('.course-grade-input'));
      return { error: STRINGS[state.lang].errGrade };
    }

    courses.push({ name, hours, grade });
  }

  /* Filter out zero-credit courses for GPA calc but still validate */
  const active = courses.filter(c => c.hours > 0);
  if (active.length === 0) {
    return { error: STRINGS[state.lang].errAllZero };
  }

  return { courses: active };
}

function highlightInput(el) {
  el.classList.add('error');
  el.focus();
  setTimeout(() => el.classList.remove('error'), 2000);
}

function showError(msg) {
  DOM.errorText.textContent = msg;
  DOM.errorMsg.classList.remove('hidden');
  /* Re-trigger shake animation */
  DOM.errorMsg.style.animation = 'none';
  requestAnimationFrame(() => {
    DOM.errorMsg.style.animation = '';
  });
}

function hideError() {
  DOM.errorMsg.classList.add('hidden');
}

/* =============================================
   8. GPA CALCULATION
   ============================================= */
/**
 * Core GPA formula:
 * GPA = Σ(gradePoints × creditHours) / Σ(creditHours)
 *
 * @param {Array<{hours:number, grade:number}>} courses
 * @returns {{ gpa:number, letter:string, totalHours:number, qualityPoints:number }}
 */
function calculateSemesterGPA(courses) {
  let totalQualityPoints = 0; // Σ(gradePoints × creditHours)
  let totalHours = 0;         // Σ(creditHours)

  for (const course of courses) {
    const { points } = gradeToGPA(course.grade);
    totalQualityPoints += points * course.hours;
    totalHours += course.hours;
  }

  const gpa = totalHours > 0 ? totalQualityPoints / totalHours : 0;
  const letter = gpaToLetter(gpa);

  return {
    gpa: Math.min(gpa, 4.0),
    letter,
    totalHours,
    qualityPoints: totalQualityPoints,
  };
}

/**
 * Cumulative GPA = totalQualityPoints / totalHours across all saved semesters.
 * @param {Array} history
 * @returns {{ cgpa:number, letter:string, totalHours:number }}
 */
function calculateCGPA(history) {
  let totalQP    = 0;
  let totalHours = 0;

  for (const sem of history) {
    totalQP    += sem.qualityPoints;
    totalHours += sem.hours;
  }

  const cgpa = totalHours > 0 ? totalQP / totalHours : 0;
  return {
    cgpa: Math.min(cgpa, 4.0),
    letter: gpaToLetter(cgpa),
    totalHours,
  };
}

/* =============================================
   9. RESULT DISPLAY
   ============================================= */
function displayResults(result) {
  const { gpa, letter, totalHours } = result;

  DOM.semGPA.textContent    = gpa.toFixed(3);
  DOM.semLetter.textContent = letter;
  DOM.semHours.textContent  = totalHours;
  DOM.semGrade.textContent  = gpa.toFixed(3);

  /* Progress bar: gpa / 4.0 × 100 % */
  const pct = (gpa / 4.0) * 100;
  DOM.gpaBarFill.style.width = pct.toFixed(1) + '%';

  /* Color the GPA value based on grade */
  const color = getGradeColor(gpa);
  DOM.semGPA.style.color = color;
  DOM.semLetter.style.color = color;

  DOM.resultsSection.classList.remove('hidden');
  DOM.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getGradeColor(gpa) {
  if (gpa >= 3.7) return 'var(--grade-a)';
  if (gpa >= 3.0) return 'var(--grade-b)';
  if (gpa >= 2.0) return 'var(--grade-c)';
  if (gpa >= 1.0) return 'var(--grade-d)';
  return 'var(--grade-f)';
}

function displayCGPA() {
  if (state.history.length === 0) {
    DOM.cgpaEmpty.classList.remove('hidden');
    DOM.cgpaDisplay.classList.add('hidden');
    return;
  }

  const { cgpa, letter, totalHours } = calculateCGPA(state.history);

  DOM.cgpaEmpty.classList.add('hidden');
  DOM.cgpaDisplay.classList.remove('hidden');

  DOM.cgpaValue.textContent      = cgpa.toFixed(3);
  DOM.cgpaGrade.textContent      = letter;
  DOM.cgpaTotalHours.textContent = totalHours;
  DOM.cgpaSemCount.textContent   = state.history.length;

  /* Animate ring: circumference of r=50 circle = 2π×50 ≈ 314.16 */
  const circumference = 314.16;
  const pct = cgpa / 4.0;
  const offset = circumference * (1 - pct);

  /* Inject gradient if not present */
  injectSVGGradient();

  requestAnimationFrame(() => {
    DOM.cgpaRingFill.style.strokeDashoffset = offset.toFixed(2);
    DOM.cgpaRingFill.style.stroke = 'url(#cgpaGrad)';
  });

  /* Color */
  const color = getGradeColor(cgpa);
  DOM.cgpaValue.style.color  = color;
  DOM.cgpaGrade.style.background = color === 'var(--grade-f)' ? 'var(--grade-f)' : color;
}

function injectSVGGradient() {
  if (document.getElementById('cgpaGrad')) return;
  const svg = DOM.cgpaRingFill.closest('svg');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="cgpaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="#1a6b9a"/>
      <stop offset="100%" stop-color="#0d9488"/>
    </linearGradient>
  `;
  svg.insertBefore(defs, svg.firstChild);
}

/* =============================================
   10. LOCAL STORAGE
   ============================================= */
function saveHistory() {
  localStorage.setItem('gpa_history', JSON.stringify(state.history));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem('gpa_history');
    state.history = raw ? JSON.parse(raw) : [];
  } catch {
    state.history = [];
  }
}

/* =============================================
   11. SAVE / DELETE / EDIT SEMESTER
   ============================================= */
function saveSemester() {
  if (!state.lastResult) return;
  const { gpa, letter, totalHours, qualityPoints, year, semester } = state.lastResult;

  /* Check for duplicate (same year + semester) — update instead of adding */
  const dupIndex = state.history.findIndex(s => s.year === year && s.semester === semester);
  const entry = { year, semester, gpa, letter, hours: totalHours, qualityPoints };

  if (dupIndex !== -1) {
    state.history[dupIndex] = entry;
    showToast(STRINGS[state.lang].dupWarn, 'info');
  } else {
    state.history.push(entry);
    showToast(STRINGS[state.lang].saved, 'success');
  }

  saveHistory();
  renderHistory();
  displayCGPA();

  /* Scroll to history */
  setTimeout(() => {
    document.querySelector('.history-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 300);
}

function deleteSemester(index) {
  state.history.splice(index, 1);
  saveHistory();
  renderHistory();
  displayCGPA();
  showToast(STRINGS[state.lang].deleted, 'danger');
}

function resetAll() {
  state.history = [];
  saveHistory();
  renderHistory();
  displayCGPA();
  showToast(STRINGS[state.lang].reset, 'danger');
}

function openEditModal(index) {
  const sem = state.history[index];
  DOM.editIndex.value  = index;
  DOM.editGPA.value    = sem.gpa.toFixed(3);
  DOM.editHours.value  = sem.hours;
  DOM.editModal.classList.remove('hidden');
  DOM.editGPA.focus();
}

function confirmEditSemester() {
  const index = parseInt(DOM.editIndex.value, 10);
  const newGPA   = parseFloat(DOM.editGPA.value);
  const newHours = parseInt(DOM.editHours.value, 10);
  const s = STRINGS[state.lang];

  if (isNaN(newGPA) || newGPA < 0 || newGPA > 4) {
    DOM.editGPA.classList.add('error');
    setTimeout(() => DOM.editGPA.classList.remove('error'), 2000);
    showToast(s.editGPAErr, 'danger');
    return;
  }
  if (isNaN(newHours) || newHours < 1 || newHours > 40) {
    DOM.editHours.classList.add('error');
    setTimeout(() => DOM.editHours.classList.remove('error'), 2000);
    showToast(s.editHoursErr, 'danger');
    return;
  }

  const newQP = newGPA * newHours;
  state.history[index] = {
    ...state.history[index],
    gpa: newGPA,
    letter: gpaToLetter(newGPA),
    hours: newHours,
    qualityPoints: newQP,
  };

  saveHistory();
  renderHistory();
  displayCGPA();
  closeAllModals();
  showToast(s.edited, 'success');
}

/* =============================================
   12. RENDER HISTORY TABLE
   ============================================= */
function getYearLabel(yearVal) {
  const idx = parseInt(yearVal, 10) - 1;
  return STRINGS[state.lang].yearNames[idx] || yearVal;
}

function getSemLabel(semVal) {
  const idx = parseInt(semVal, 10) - 1;
  return STRINGS[state.lang].semNames[idx] || semVal;
}

function renderHistory() {
  if (state.history.length === 0) {
    DOM.historyEmpty.classList.remove('hidden');
    DOM.historyTableWrapper.classList.add('hidden');
    return;
  }

  DOM.historyEmpty.classList.add('hidden');
  DOM.historyTableWrapper.classList.remove('hidden');

  DOM.historyBody.innerHTML = state.history.map((sem, i) => `
    <tr>
      <td><span class="year-badge">${getYearLabel(sem.year)}</span></td>
      <td>${getSemLabel(sem.semester)}</td>
      <td><span class="history-gpa">${sem.gpa.toFixed(3)}</span></td>
      <td><span class="history-grade">${sem.letter}</span></td>
      <td>${sem.hours}</td>
      <td>
        <div class="table-actions">
          <button class="action-btn edit-btn" data-index="${i}" title="Edit" aria-label="Edit semester">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="action-btn del-btn" data-index="${i}" title="Delete" aria-label="Delete semester">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  /* Attach action listeners */
  DOM.historyBody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.index, 10)));
  });
  DOM.historyBody.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.deleteTarget = parseInt(btn.dataset.index, 10);
      DOM.deleteModal.classList.remove('hidden');
    });
  });
}

/* =============================================
   13. TOAST NOTIFICATIONS
   ============================================= */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.classList.add('toast', `toast-${type}`);

  const icon = type === 'success' ? 'fa-circle-check'
             : type === 'danger'  ? 'fa-circle-exclamation'
             : 'fa-circle-info';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  /* Auto-hide after 3s */
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}

/* =============================================
   14. MODAL HELPERS
   ============================================= */
function closeAllModals() {
  DOM.editModal.classList.add('hidden');
  DOM.deleteModal.classList.add('hidden');
  DOM.resetModal.classList.add('hidden');
}

/* Close modals on overlay click */
[DOM.editModal, DOM.deleteModal, DOM.resetModal].forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) closeAllModals();
  });
});

/* Close on Escape */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllModals();
});

/* =============================================
   15. GRADING SCALE TOGGLE
   ============================================= */
function toggleGradeRef() {
  const content = DOM.gradeRefContent;
  const chevron = DOM.gradeChevron;
  const isHidden = content.classList.toggle('hidden');
  chevron.classList.toggle('open', !isHidden);
}

/* =============================================
   16. EVENT WIRING
   ============================================= */
function wireEvents() {
  /* Language toggle */
  DOM.langToggle.addEventListener('click', () => {
    applyLang(state.lang === 'ar' ? 'en' : 'ar');
  });

  /* Theme toggle */
  DOM.themeToggle.addEventListener('click', () => {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
  });

  /* Add course */
  DOM.addCourseBtn.addEventListener('click', addCourse);

  /* Clear form */
  DOM.clearFormBtn.addEventListener('click', clearForm);

  /* Calculate */
  DOM.calculateBtn.addEventListener('click', () => {
    hideError();

    const year = DOM.academicYear.value;
    const sem  = DOM.semester.value;
    const s = STRINGS[state.lang];

    if (!year) { showError(s.errYear); return; }
    if (!sem)  { showError(s.errSem);  return; }

    const validation = getValidatedCourses();
    if (validation.error) {
      showError(validation.error);
      return;
    }

    const result = calculateSemesterGPA(validation.courses);
    state.lastResult = { ...result, year, semester: sem };

    displayResults(result);
    showToast(s.calcSuccess, 'success');
  });

  /* Save semester */
  DOM.saveSemesterBtn.addEventListener('click', saveSemester);

  /* Reset all */
  DOM.resetAllBtn.addEventListener('click', () => {
    if (state.history.length === 0) return;
    DOM.resetModal.classList.remove('hidden');
  });

  /* Grading scale toggle */
  DOM.toggleGradeRef.addEventListener('click', toggleGradeRef);

  /* Edit modal */
  DOM.closeEditModal.addEventListener('click', closeAllModals);
  DOM.cancelEdit.addEventListener('click', closeAllModals);
  DOM.confirmEdit.addEventListener('click', confirmEditSemester);

  /* Delete modal */
  DOM.closeDeleteModal.addEventListener('click', closeAllModals);
  DOM.cancelDelete.addEventListener('click', closeAllModals);
  DOM.confirmDelete.addEventListener('click', () => {
    if (state.deleteTarget !== null) {
      deleteSemester(state.deleteTarget);
      state.deleteTarget = null;
    }
    closeAllModals();
  });

  /* Reset modal */
  DOM.closeResetModal.addEventListener('click', closeAllModals);
  DOM.cancelReset.addEventListener('click', closeAllModals);
  DOM.confirmReset.addEventListener('click', () => {
    resetAll();
    closeAllModals();
  });

  /* System theme change listener */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('gpa_theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/* =============================================
   17. INIT
   ============================================= */
function init() {
  /* Load persisted state */
  loadHistory();

  /* Apply saved or auto-detected preferences */
  applyTheme(detectTheme());
  applyLang(detectLang());

  /* Add an initial course row */
  DOM.coursesList.appendChild(createCourseRow());

  /* Wire all event listeners */
  wireEvents();

  /* Render history table and CGPA from saved data */
  renderHistory();
  displayCGPA();
}

/* Run after DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
