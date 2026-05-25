-- ============================================================
-- Migration 005: Company Employee Roster + Survey Department Targeting
-- ============================================================

-- 1A. Employees table (company-level roster)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

CREATE INDEX idx_employees_company ON employees(company_id);
CREATE INDEX idx_employees_department ON employees(department_id);

CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 1B. Survey target departments junction table
-- Empty set = "all departments" (default). Rows = specific departments only.
CREATE TABLE survey_target_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  UNIQUE(survey_id, department_id)
);

CREATE INDEX idx_survey_target_depts_survey ON survey_target_departments(survey_id);

-- 1C. Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_target_departments ENABLE ROW LEVEL SECURITY;

-- 1D. RLS policies for employees
CREATE POLICY "employees_select" ON employees FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR company_id = get_my_company_id()
);

CREATE POLICY "employees_insert" ON employees FOR INSERT WITH CHECK (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "employees_update" ON employees FOR UPDATE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

CREATE POLICY "employees_delete" ON employees FOR DELETE USING (
  company_id = get_my_company_id() AND get_my_role() IN ('ADMIN', 'HR')
);

-- 1E. RLS policies for survey_target_departments
CREATE POLICY "survey_target_depts_select" ON survey_target_departments FOR SELECT USING (
  get_my_role() = 'SUPER_ADMIN' OR EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
  )
);

CREATE POLICY "survey_target_depts_insert" ON survey_target_departments FOR INSERT WITH CHECK (
  get_my_role() IN ('ADMIN', 'HR') AND EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
  )
);

CREATE POLICY "survey_target_depts_delete" ON survey_target_departments FOR DELETE USING (
  get_my_role() IN ('ADMIN', 'HR') AND EXISTS (
    SELECT 1 FROM surveys s WHERE s.id = survey_id AND s.company_id = get_my_company_id()
  )
);

-- 1F. Backfill employees from existing survey_participants
-- Picks the most recent department assignment per (company, email)
INSERT INTO employees (company_id, email, department_id, created_at)
SELECT DISTINCT ON (s.company_id, sp.email)
  s.company_id,
  sp.email,
  sp.department_id,
  sp.invited_at
FROM survey_participants sp
JOIN surveys s ON s.id = sp.survey_id
WHERE sp.department_id IS NOT NULL
ORDER BY s.company_id, sp.email, sp.invited_at DESC
ON CONFLICT (company_id, email) DO NOTHING;
