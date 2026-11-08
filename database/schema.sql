
-- Users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_projects_user
        FOREIGN KEY (user_id)
        REFERENCES public.users (id),

    CONSTRAINT chk_projects_status
        CHECK (status IN (
            'PLANNED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        ))
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id
    ON public.projects (user_id);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'TODO',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tasks_project
        FOREIGN KEY (project_id)
        REFERENCES public.projects (id),

    CONSTRAINT chk_tasks_status
        CHECK (status IN (
            'TODO',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED'
        ))
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id
    ON public.tasks (project_id);
