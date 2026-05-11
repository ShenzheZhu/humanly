# Admin Portal & Project-Based Writing Platform Design Document

## Overview

This document describes the frontend and high-level product design for the **Admin Portal** and **User Project Enrollment System** for the Humanly platform.

The goal is to support:

* Admin-created writing projects
* Invite-code based project enrollment
* Project-scoped AI settings
* Shared instruction PDFs/files
* User writing submissions
* AI usage monitoring
* Admin-side monitoring/logging

The system consists of two frontend applications:

1. Admin Portal (`frontend`)
2. User Portal (`frontend-user`)

The design may reuse existing components and logic from current frontend packages.

---

# System Architecture Overview

## Frontend Applications

### 1. Admin Portal

Used by instructors/admins to:

* Create/manage projects
* Upload instruction files
* Configure AI permissions
* Monitor enrolled users
* Review user submissions
* View writing logs/activity

### 2. User Portal

Used by students/users to:

* Create personal documents
* Join projects using invite codes
* Access project instruction files
* Write submissions
* Use AI assistance within limits

Note that now in the frontend-user, we still have the functionality of certificate, we will keep it.

---

# Core Concepts

## Project

A project is created by an admin and contains:

| Field             | Description                     |
| ----------------- | ------------------------------- |
| Project Name      | Human-readable title            |
| Project ID        | Internal UUID/database ID       |
| Created Date      | Timestamp                       |
| Description       | Project summary/instructions    |
| Files             | PDFs or other instruction files |
| Invite Code       | Unique 6-character code         |
| Enrolled Users    | Users who joined the project    |
| Allowed AI Models | Whitelisted models              |
| AI Usage Limit    | AI usage quota/rate limit       |
| User Documents    | User submissions/documents      |

---

# Admin Portal Design

# Admin Login Flow

## Flow

```text
Admin opens admin portal
        ↓
Clicks Login
        ↓
Enter email/password
        ↓
Authentication succeeds
        ↓
Redirect to Admin Dashboard
```

Note:

* Authentication system already exists.
* Reuse current auth/session infrastructure.

---

# Admin Dashboard

## Purpose

The dashboard displays all projects created by the current admin.

---

## Dashboard UI

Each project card/table row should display:

| Field                    |
| ------------------------ |
| Project Name             |
| Project ID               |
| Created Date             |
| Description              |
| Invite Code              |
| Number of Enrolled Users |
| Allowed AI Models        |
| AI Usage Limit           |
| Number of User Documents |

---

## Admin Actions

Admin should be able to:

* Create new project
* View project descriptions
* Edit project settings
* Copy invite code
* View enrolled users
* View submitted documents
* Delete/archive project

---

# Create Project Flow

## Flow

```text
Admin Dashboard
        ↓
Click "Create New Project"
        ↓
Fill project form
        ↓
Submit
        ↓
Backend creates project
        ↓
Backend generates invite code
        ↓
Upload files linked to project
        ↓
Redirect to Project Detail Page
```

---

## Create Project Form

### Required Fields

| Field              | Type         |
| ------------------ | ------------ |
| Project Name       | Text         |
| Description        | Textarea     |
| Allowed LLM Models | Multi-select |
| AI Usage Limit     | Number       |

---

## Optional Fields

| Field             | Type              |
| ----------------- | ----------------- |
| Instruction Files | Multi-file upload |
| Invitation Emails | Optional/Future   |

---

## Notes

### Invite Mechanism

Instead of invitation emails:

* Use invite-code based enrollment
* Simpler UX
* Easier scaling
* Similar to classroom/course code systems

Example:

```text
A7K2QX
```

---

# Project Detail Page

## Purpose

Displays all information related to a single project.

---

## Sections/Tabs

| Section     | Purpose                    |
| ----------- | -------------------------- |
| Overview    | Metadata & statistics      |
| Users       | Enrolled users             |
| Documents   | User submissions           |
| AI Settings | Model permissions & limits |
| Invitation  | Invite code management     |

---

## Overview Section

Should display:

* Project Name
* Description
* Created Date
* Uploaded Instruction Files
* Invite Code
* Total Users
* Total Documents
* AI Usage Statistics

---

## Users Section

Should display:

| Field               |
| ------------------- |
| User Name           |
| Email               |
| Joined Date         |
| Number of Documents |
| AI Usage Count      |

Possible actions:

* View user documents
* Open activity logs
* Remove user from project

---

## Documents Section

Displays all project-related user documents.

### Possible Table Columns

| Field             |
| ----------------- |
| Document Name     |
| User              |
| Last Updated      |
| Word Count        |
| AI Usage          |
| Submission Status |

---

# Admin Check Users Flow

## Flow

```text
Admin Login
        ↓
Dashboard
        ↓
Open Project
        ↓
Users Tab
        ↓
Select User
```

---

## Suggested UI Layout

### Left Side

User document/editor view.

### Right Side

Activity/logging panel.

Potential logs:

* Typing activity
* AI usage history
* Prompt requests
* Revision timeline
* Writing statistics
* Session events

This is conceptually similar to systems like Quercus/logging dashboards.

---

# User Portal Design

# User Login Flow

## Flow

```text
User Login
        ↓
User Dashboard
```

---

# User Dashboard

The dashboard contains two major sections.

---

## Section 1: My Documents

Documents independently created by the user.

These are personal/private documents.

---

## Section 2: Enrolled Project Documents

Documents associated with projects joined via invite code.

Each project document is scoped to a specific project.

---

# Join Project Flow

## Flow

```text
User Dashboard
        ↓
Click "Join Project"
        ↓
Enter Invite Code
        ↓
Backend validates code
        ↓
User enrolled into project
        ↓
Project document appears on dashboard
```

---

## UI Requirement

Add a button:

```text
+ Join Project
```

Opens invite-code modal/input.

---

# User Document Opening Flow

# Case 1: User’s Own Document

## Behavior

Open normal editor experience.

---

## Layout Options

### If PDF exists

| Left Side | Right Side     |
| --------- | -------------- |
| User PDF  | Writing editor |

### If no PDF exists

Use:

* Full-screen editor
* Standard writing interface

---

# Case 2: Project Document

## Behavior

Open project-scoped writing interface.

---

## Layout

| Left Side             | Right Side          |
| --------------------- | ------------------- |
| Admin Instruction PDF(Maybe create a style like tab, each tab represent the pdf from admin) | User Writing Editor |

---

## Important Rules

### Project PDF Ownership

The instruction PDF:

* Comes from the admin-created project
* Is shared across enrolled users
* Is NOT uploaded individually by users

---

## User Workflow

```text
Admin uploads instruction PDF
        ↓
User joins project
        ↓
User opens project document
        ↓
Left side shows project PDF
        ↓
Right side is user response editor
```

---

# Suggested Database-Level Entities

## Users

```text
users
```

---

## Projects

```text
projects
```

Fields:

* id
* admin_id
* name
* description
* invite_code
* created_at
* ai_usage_limit

---

## Project Files

```text
project_files
```

Fields:

* id
* project_id
* file_url
* file_type

---

## Project Enrollments

```text
project_enrollments
```

Fields:

* id
* project_id
* user_id
* joined_at

---

## Project Allowed Models

```text
project_allowed_models
```

Fields:

* id
* project_id
* model_name

---

## Documents

```text
documents
```

Additional fields:

* project_id nullable
* owner_user_id
* document_type

  * personal
  * project_submission

---

# Suggested Frontend Structure

## Monorepo Packages

```text
packages/
├── frontend
├── frontend-user
├── backend
├── shared
├── editor
├── tracker
```

---

# Suggested Admin Routes

```text
/admin/login
/admin/dashboard
/admin/projects/create
/admin/projects/:projectId
/admin/projects/:projectId/users
/admin/projects/:projectId/documents
/admin/projects/:projectId/settings
```

---

# Suggested User Routes

```text
/dashboard
/documents/:documentId
/projects/join
/projects/:projectId/document/:documentId
```

---

# Future Enhancements

## Potential Features

### AI Analytics

* AI requests per user
* AI usage trends
* Token consumption
* Prompt analytics

---

### Submission System

* Draft/submitted/finalized states
* Deadlines
* Lock editing after submission

---

### Real-Time Monitoring

* Live writing sessions
* Typing telemetry
* Live AI assistance monitoring

---

### Role System

Possible future roles:

* Admin
* TA
* Student
* Reviewer

---

# Recommended MVP Scope

For initial implementation:

## Build First

### Admin Side

* Project CRUD
* Invite code system
* File upload
* Allowed model settings
* User list
* Document list

### User Side

* Join project
* Project dashboard section
* Project document editor
* Shared PDF viewer

---

## Build Later

* Advanced analytics
* Real-time monitoring
* Invitation emails
* Submission workflow
* Role hierarchy
