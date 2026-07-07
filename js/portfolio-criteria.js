// ===== نظام شواهد الأداء الوظيفي للمعلم =====
// عناصر تقييم الأداء الوظيفي الـ 11 (وزارة التعليم السعودية) مع أوزانها.
// هذا الملف هو النواة المشتركة بين صفحة المعلم ولوحة المدير وتقرير الـ PDF.

// المعايير ثابتة رسمياً — لا تُعدَّل من الواجهة.
const PERFORMANCE_CRITERIA = [
  { id: 1,  order: 1,  weight: 10, title: 'أداء الواجبات الوظيفية',
    examples: ['جدول الحصص', 'تكليفات', 'سجل الانضباط', 'تنفيذ المناوبة', 'الالتزام بالتعاميم'] },
  { id: 2,  order: 2,  weight: 10, title: 'التفاعل مع المجتمع المهني',
    examples: ['مجتمعات تعلم مهنية', 'تبادل زيارات', 'ورشة داخلية', 'اجتماع قسم', 'مشاركة خبرة'] },
  { id: 3,  order: 3,  weight: 10, title: 'التفاعل مع أولياء الأمور',
    examples: ['سجل تواصل', 'رسائل متابعة', 'اجتماع ولي أمر', 'خطة متابعة طالب متعثر'] },
  { id: 4,  order: 4,  weight: 10, title: 'التنويع في استراتيجيات التدريس',
    examples: ['تعلم تعاوني', 'عصف ذهني', 'تعلم باللعب', 'خرائط مفاهيم', 'صور من الحصة'] },
  { id: 5,  order: 5,  weight: 10, title: 'تحسين نتائج المتعلمين',
    examples: ['قياس قبلي وبعدي', 'خطة علاجية', 'مقارنة نتائج', 'معالجة فاقد تعليمي'] },
  { id: 6,  order: 6,  weight: 10, title: 'إعداد وتنفيذ خطة التعلم',
    examples: ['خطة فصلية', 'تحضير درس', 'توزيع منهج', 'أهداف تعلم', 'خطة علاجية'] },
  { id: 7,  order: 7,  weight: 10, title: 'توظيف تقنيات ووسائل التعلم المناسبة',
    examples: ['Wordwall', 'Kahoot', 'Forms', 'منصة مدرستي', 'اختبار إلكتروني', 'عرض تفاعلي'] },
  { id: 8,  order: 8,  weight: 5,  title: 'تهيئة البيئة التعليمية',
    examples: ['تنظيم الفصل', 'لوحات تعليمية', 'قواعد صفية', 'صور بيئة التعلم'] },
  { id: 9,  order: 9,  weight: 5,  title: 'الإدارة الصفية',
    examples: ['قواعد إدارة الصف', 'سجل متابعة', 'بطاقات تعزيز', 'توزيع مجموعات'] },
  { id: 10, order: 10, weight: 10, title: 'تحليل نتائج المتعلمين وتشخيص مستوياتهم',
    examples: ['تحليل اختبار', 'Excel', 'تصنيف مستويات الطلاب', 'توصيات علاجية'] },
  { id: 11, order: 11, weight: 10, title: 'تنوع أساليب التقويم',
    examples: ['اختبار قصير', 'شفهي', 'بطاقة ملاحظة', 'Rubric', 'مشروع', 'واجب', 'تذكرة خروج'] },
];

// أنواع الشاهد
const EVIDENCE_TYPES = [
  { key: 'image',    label: 'صورة',          icon: '🖼️' },
  { key: 'pdf',      label: 'PDF',           icon: '📄' },
  { key: 'link',     label: 'رابط',          icon: '🔗' },
  { key: 'word',     label: 'ملف Word',      icon: '📝' },
  { key: 'excel',    label: 'ملف Excel',     icon: '📊' },
  { key: 'report',   label: 'تقرير',         icon: '🗒️' },
  { key: 'form',     label: 'نموذج',         icon: '📋' },
  { key: 'equiz',    label: 'اختبار إلكتروني', icon: '💻' },
  { key: 'activity', label: 'نشاط تفاعلي',   icon: '🎮' },
];

// حالات الشاهد
const EVIDENCE_STATUS = [
  { key: 'draft',      label: 'مسودة',          icon: '📝', badge: 'badge-inactive' },
  { key: 'submitted',  label: 'مرسل للمراجعة',  icon: '📤', badge: 'badge-homework' },
  { key: 'approved',   label: 'معتمد',           icon: '✅', badge: 'badge-active' },
  { key: 'needs_edit', label: 'يحتاج تعديل',     icon: '✏️', badge: 'badge-challenge' },
  { key: 'rejected',   label: 'مرفوض',           icon: '❌', badge: 'badge-inactive' },
];

function criterionById(id)      { return PERFORMANCE_CRITERIA.find(c => c.id === Number(id)); }
function evidenceTypeMeta(key)   { return EVIDENCE_TYPES.find(t => t.key === key) || EVIDENCE_TYPES[3]; }
function evidenceStatusMeta(key) { return EVIDENCE_STATUS.find(s => s.key === key) || EVIDENCE_STATUS[0]; }

// ===== تخزين الشواهد (localStorage — مع مزامنة سحابية اختيارية) =====
function getAllEvidences() {
  return JSON.parse(localStorage.getItem('evidences') || '[]');
}
function saveAllEvidences(list) {
  localStorage.setItem('evidences', JSON.stringify(list));
}
function getTeacherEvidences(teacherId) {
  const tid = Number(teacherId);
  return getAllEvidences().filter(e => Number(e.teacherId) === tid);
}

// ===== حساب التغطية المركّبة (مؤشر مساعد للمدير فقط، وليس درجة رسمية) =====
// تغطية كل معيار من 100% = 70% عدد الشواهد المعتمدة + 20% تنوّع الأنواع + 10% اكتمال البيانات.
// لا يُحتسب في التغطية إلا الشاهد "المعتمد". باقي الحالات تظهر في العدّادات فقط.

// عدد الشواهد المعتمدة المطلوبة للتغطية الكاملة من ناحية العدد: 3 للمعيار وزن 10%، 2 للوزن 5%.
function requiredApprovedCount(criterion) {
  return criterion.weight >= 10 ? 3 : 2;
}

// اكتمال بيانات شاهد واحد (0..1): عنوان، وصف، تاريخ، أثر، مرفق/رابط، ارتباط بالمعيار.
function evidenceCompleteness(e) {
  const checks = [
    !!(e.title && e.title.trim()),
    !!(e.description && e.description.trim()),
    !!e.evidenceDate,
    !!(e.impactNote && e.impactNote.trim()),
    !!(e.fileUrl && e.fileUrl.trim()),
    !!e.criterionId,
  ];
  return checks.filter(Boolean).length / checks.length;
}

function criterionStats(teacherEvidences, criterionId) {
  const crit = criterionById(criterionId);
  const list = teacherEvidences.filter(e => Number(e.criterionId) === Number(criterionId));
  const count = key => list.filter(e => e.status === key).length;
  const approvedList = list.filter(e => e.status === 'approved');
  const approved = approvedList.length;

  // 1) العدد — 70%
  const target = requiredApprovedCount(crit);
  const countPart = Math.min(approved / target, 1) * 70;

  // 2) التنوّع — 20% (بحد أقصى 3 أنواع مختلفة بين الشواهد المعتمدة)
  const distinctTypes = new Set(approvedList.map(e => e.evidenceType)).size;
  const diversityPart = approved ? Math.min(distinctTypes / 3, 1) * 20 : 0;

  // 3) اكتمال البيانات — 10% (متوسط اكتمال الشواهد المعتمدة)
  const avgCompleteness = approved
    ? approvedList.reduce((s, e) => s + evidenceCompleteness(e), 0) / approved
    : 0;
  const completenessPart = avgCompleteness * 10;

  const coveragePct = Math.round(countPart + diversityPart + completenessPart);

  return {
    total: list.length,
    draft: count('draft'),
    submitted: count('submitted'),
    approved,
    needs_edit: count('needs_edit'),
    rejected: count('rejected'),
    covered: approved > 0,
    coveragePct,
    target,
    distinctTypes,
    parts: {
      count: Math.round(countPart),
      diversity: Math.round(diversityPart),
      completeness: Math.round(completenessPart),
    },
  };
}

// مؤشر اكتمال الملف الكلي = مجموع (وزن المعيار × تغطيته). مؤشر مساعد فقط — ليس درجة الأداء.
function portfolioCompletion(teacherEvidences) {
  let sum = 0;
  PERFORMANCE_CRITERIA.forEach(c => {
    const st = criterionStats(teacherEvidences, c.id);
    sum += (c.weight * st.coveragePct) / 100;
  });
  return Math.round(sum); // من 100
}

// عدّاد سريع للحالات عبر كل الشواهد
function statusTotals(teacherEvidences) {
  const t = { draft: 0, submitted: 0, approved: 0, needs_edit: 0, rejected: 0, total: teacherEvidences.length };
  teacherEvidences.forEach(e => { if (t[e.status] !== undefined) t[e.status]++; });
  return t;
}

// أكثر المعايير نقصاً عبر مجموعة معلمين (لِلوحة المدير)
// تُعيد المعايير مرتبة تصاعدياً حسب عدد المعلمين الذين غطّوها.
function mostLackingCriteria(teachers) {
  return PERFORMANCE_CRITERIA.map(c => {
    let coveredBy = 0;
    teachers.forEach(t => {
      if (criterionStats(t.evidences, c.id).covered) coveredBy++;
    });
    return {
      criterion: c,
      coveredBy,
      totalTeachers: teachers.length,
      coveragePct: teachers.length ? Math.round((coveredBy / teachers.length) * 100) : 0,
    };
  }).sort((a, b) => a.coveredBy - b.coveredBy);
}

// اسم مدرسة المعلم من سجل teachers
function teacherSchool(teacher) {
  return (teacher && teacher.school) ? teacher.school : 'مدرسة غير محددة';
}
