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

  async function upsertEvidence(ev) {
    return request('evidences?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([{
        id: Number(ev.id),
        teacher_id: Number(ev.teacherId || 1),
        school_id: ev.schoolId ? Number(ev.schoolId) : null,
        criterion_id: Number(ev.criterionId),
        title: ev.title,
        description: ev.description || '',
        evidence_date: ev.evidenceDate || null,
        evidence_type: ev.evidenceType || 'file',
        file_url: ev.fileUrl || '',
        storage_path: ev.storagePath || '',
        impact_note: ev.impactNote || '',
        status: ev.status || 'draft',
        manager_note: ev.managerNote || '',
        reviewed_by: ev.reviewedBy ? Number(ev.reviewedBy) : null,
        reviewed_at: ev.reviewedAt || null,
        created_at: ev.createdAt || new Date().toISOString(),
        updated_at: ev.updatedAt || new Date().toISOString()
      }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  // ===== تخزين مرفقات الشواهد في Supabase Storage =====
  const EVIDENCE_BUCKET = 'evidence-attachments';

  // ضغط الصور قبل الرفع (JPG/PNG/WEBP) عبر canvas. غير الصور تُعاد كما هي.
  async function compressImage(file, maxDim = 1600, quality = 0.8) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }

  // يرفع الملف إلى المسار school_id/teacher_id/evidence_id/file-name ويعيد { path, publicUrl }.
  async function uploadEvidenceFile(file, { schoolId, teacherId, evidenceId }) {
    if (!isEnabled()) throw new Error('التخزين السحابي غير مُفعّل');
    const payload = await compressImage(file);
    const safeName = (file.name || 'file')
      .replace(/[^\w.\-]+/g, '_')
      .replace(/^image\/\w+$/, 'image')
      .replace(/\.[^.]+$/, m => (payload !== file && /image/.test(file.type)) ? '.webp' : m);
    const path = `${Number(schoolId) || 0}/${Number(teacherId) || 0}/${Number(evidenceId)}/${Date.now()}_${safeName}`;
    const res = await fetch(`${url}/storage/v1/object/${EVIDENCE_BUCKET}/${encodeURI(path)}`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': payload.type || file.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: payload
    });
    if (!res.ok) throw new Error(`Storage error (${res.status}): ${await res.text()}`);
    return {
      path,
      publicUrl: `${url}/storage/v1/object/public/${EVIDENCE_BUCKET}/${encodeURI(path)}`
    };
  }

  async function deleteEvidence(id) {
    return request(`evidences?id=eq.${Number(id)}`, { method: 'DELETE', prefer: 'return=minimal' });
  }

  async function listEvidencesByTeacher(teacherId) {
    return request(`evidences?teacher_id=eq.${Number(teacherId)}&order=criterion_id.asc`);
  }

  async function listAllEvidences() {
    return request('evidences?order=teacher_id.asc');
  }

  // ===== المدارس والمعلمون والمديرون (المصدر الأساسي عبر الأجهزة) =====
  async function findOrCreateSchool(name, city) {
    const clean = (name || '').trim();
    if (!clean) return null;
    const rows = await request(`schools?name=eq.${encodeURIComponent(clean)}&limit=1`);
    if (rows && rows[0]) return rows[0];
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const created = await request('schools?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([{ id, name: clean, city: city || '', created_at: new Date().toISOString() }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
    return (created && created[0]) ? created[0] : { id, name: clean, city: city || '' };
  }

  async function upsertTeacher(t) {
    const now = new Date().toISOString();
    return request('teachers?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([{
        id: Number(t.id),
        user_id: t.userId ? Number(t.userId) : null,
        full_name: t.name,
        username: t.username || t.email || '',
        email: t.email || '',
        password: t.password || '',
        subject: t.subject || '',
        grade: t.grade || '',
        school_id: t.schoolId ? Number(t.schoolId) : null,
        school_name: t.school || '',
        created_at: t.createdAt || now,
        updated_at: now
      }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  async function findTeacherByUsername(username) {
    const u = encodeURIComponent((username || '').trim());
    const rows = await request(`teachers?or=(username.eq.${u},email.eq.${u})&limit=1`);
    return rows && rows[0] ? rows[0] : null;
  }

  async function listTeachersBySchool(schoolId) {
    return request(`teachers?school_id=eq.${Number(schoolId)}&order=full_name.asc`);
  }

  async function upsertManager(mgr) {
    const now = new Date().toISOString();
    return request('managers?on_conflict=id', {
      method: 'POST',
      body: JSON.stringify([{
        id: Number(mgr.id),
        full_name: mgr.name,
        name: mgr.name,
        email: mgr.email || '',
        username: mgr.username || '',
        password: mgr.password,
        school_id: mgr.schoolId ? Number(mgr.schoolId) : null,
        school_name: mgr.school || '',
        created_at: mgr.createdAt || now,
        updated_at: now
      }]),
      prefer: 'resolution=merge-duplicates,return=representation'
    });
  }

  async function findManagerByUsername(username) {
    const u = encodeURIComponent((username || '').trim());
    const rows = await request(`managers?or=(username.eq.${u},email.eq.${u})&limit=1`);
    return rows && rows[0] ? rows[0] : null;
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
    listResultsByClass,
    upsertEvidence,
    deleteEvidence,
    listEvidencesByTeacher,
    listAllEvidences,
    upsertManager,
    findOrCreateSchool,
    upsertTeacher,
    findTeacherByUsername,
    listTeachersBySchool,
    findManagerByUsername,
    uploadEvidenceFile,
    compressImage
  };
})(window);
