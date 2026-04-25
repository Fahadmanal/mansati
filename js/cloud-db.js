// Lightweight Supabase REST client for shared data syncing.
(function attachCloudDB(global) {
  const cfg = global.SUPABASE_CONFIG || {};
  const url = (cfg.url || '').replace(/\/$/, '');
  const anonKey = cfg.anonKey || '';

  function isEnabled() {
    return Boolean(url) && Boolean(anonKey) && !anonKey.includes('PASTE_YOUR');
  }

  async function request(path, options = {}) {
    if (!isEnabled()) return null;
    const res = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: options.prefer || 'return=representation',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Cloud DB error (${res.status}): ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function upsertClass(cls) {
    return request('classes?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([{
        id: Number(cls.id),
        name: cls.name,
        subject: cls.subject || '',
        code: cls.code,
        teacher_id: Number(cls.teacherId || 1),
        student_count: Number(cls.studentCount || 0),
        created_at: cls.createdAt || new Date().toISOString()
      }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  async function findClassByCode(code) {
    const rows = await request(`classes?code=eq.${encodeURIComponent(code)}&limit=1`);
    return rows && rows[0] ? rows[0] : null;
  }

  async function listClassesByTeacher(teacherId) {
    return request(`classes?teacher_id=eq.${Number(teacherId || 1)}&order=id.desc`);
  }

  async function upsertTest(test) {
    return request('tests?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([{
        id: Number(test.id),
        class_id: Number(test.classId),
        title: test.title,
        type: test.type,
        duration: Number(test.duration || 0),
        questions: test.questions || [],
        active: Boolean(test.active),
        teacher_id: Number(test.teacherId || 1),
        created_at: test.createdAt || new Date().toISOString()
      }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  async function listTestsByClass(classId, activeOnly) {
    const filters = [`class_id=eq.${Number(classId)}`];
    if (activeOnly) filters.push('active=eq.true');
    return request(`tests?${filters.join('&')}&order=created_at.desc`);
  }

  async function upsertStudent(student) {
    return request('students?on_conflict=class_id,name', {
      method: 'POST',
      body: JSON.stringify([{
        class_id: Number(student.classId),
        name: student.name,
        added_at: student.addedAt || new Date().toISOString()
      }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  async function listStudentsByClass(classId) {
    return request(`students?class_id=eq.${Number(classId)}&order=added_at.asc`);
  }

  async function insertResult(result) {
    return request('results', {
      method: 'POST',
      body: JSON.stringify([{
        student_name: result.studentName,
        class_id: Number(result.classId),
        test_id: Number(result.testId),
        score: Number(result.score || 0),
        correct: Number(result.correct || 0),
        total: Number(result.total || 0),
        total_questions: Number(result.totalQuestions || result.total || 0),
        needs_manual_review: Boolean(result.needsManualReview),
        type: result.type,
        duration_text: result.time || '—',
        date_text: result.date || '',
        answers: result.answers || {}
      }])
    });
  }

  async function listResultsByClass(classId) {
    return request(`results?class_id=eq.${Number(classId)}&order=id.desc`);
  }

  global.cloudDB = {
    isEnabled,
    upsertClass,
    findClassByCode,
    listClassesByTeacher,
    upsertTest,
    listTestsByClass,
    upsertStudent,
    listStudentsByClass,
    insertResult,
    listResultsByClass
  };
})(window);
