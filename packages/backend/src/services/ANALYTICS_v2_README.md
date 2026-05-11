# Analytics v2 Calculation Logic

This document describes the current backend analytics calculation logic in
`analytics.service.ts`. It is intentionally implementation-level: if the SQL in
`AnalyticsService` changes, this document should be updated with it.

## Scope

Analytics v2 reads data for an admin-owned project and returns project-level
activity metrics. Every analytics method first verifies that the requesting
admin owns the project.

Main endpoints:

- `GET /api/v1/projects/:projectId/analytics/summary`
- `GET /api/v1/projects/:projectId/analytics/events-timeline`
- `GET /api/v1/projects/:projectId/analytics/event-types`
- `GET /api/v1/projects/:projectId/analytics/users`
- `GET /api/v1/projects/:projectId/analytics/sessions`
- `GET /api/v1/projects/:projectId/analytics/sessions/:sessionId`

## Data Sources

Analytics combines two activity sources.

### 1. Tracker Activity

Tracker activity is created by the embedded tracker snippet or iframe flow.

Tables:

- `sessions`
- `events`

Relationship:

- `sessions.project_id = projects.id`
- `events.session_id = sessions.id`
- `events.project_id = projects.id`

User identity:

- `sessions.external_user_id`

Tracker session duration:

```text
duration_seconds = session_end - session_start
```

If `session_end` is null, the current backend time is used:

```text
duration_seconds = NOW() - session_start
```

Tracker submission status:

- `sessions.submitted`
- `sessions.submission_time`

### 2. User Portal Submission Activity

User portal activity is created when an enrolled user opens a project submission
document and the editor posts document events to:

```text
POST /api/v1/documents/:id/events
```

Tables:

- `project_enrollments`
- `documents`
- `document_events`
- `users`

Relationship:

- `project_enrollments.project_id = projects.id`
- `project_enrollments.user_id = users.id`
- `project_enrollments.submission_document_id = documents.id`
- `document_events.document_id = project_enrollments.submission_document_id`
- `document_events.user_id = users.id`

User identity:

- `users.email`

Document session definition:

Analytics treats one linked project submission document as one analytics
session per user. This is not a row in the `sessions` table. It is derived from
`document_events`.

Document session start:

```text
MIN(document_events.timestamp)
```

Document session end:

```text
MAX(document_events.timestamp)
```

Document session duration:

```text
MAX(document_events.timestamp) - MIN(document_events.timestamp)
```

Document submission status:

```text
submitted = false
```

The user portal submission path currently does not mark the derived document
session as submitted.

## Shared Filters

Most analytics endpoints support these filters:

- `startDate`
- `endDate`
- `externalUserId`
- `eventType`

Filter behavior differs slightly by endpoint.

### Date Filters

Tracker sessions are filtered by `sessions.session_start` for session-based
metrics.

Tracker events are filtered by `events.timestamp` for event-based metrics.

Document events are filtered by `document_events.timestamp`.

### User Filter

For tracker data:

```text
sessions.external_user_id = externalUserId
```

For user portal document data:

```text
users.email = externalUserId
```

### Event Type Filter

For tracker data:

```text
events.event_type = eventType
```

For user portal document data:

```text
document_events.event_type = eventType
```

### User Activity Endpoint Filter Limitation

`GET /analytics/users` currently accepts only:

- `startDate`
- `endDate`
- `page`
- `limit`

It does not currently apply `externalUserId` or `eventType`.

## Summary Stats

Endpoint:

```text
GET /api/v1/projects/:projectId/analytics/summary
```

Returned fields:

- `totalEvents`
- `totalSessions`
- `uniqueUsers`
- `totalUsers`
- `avgEventsPerSession`
- `avgSessionDuration`
- `completionRate`
- `activeUsers24h`

### totalEvents

Total event count from both tracker events and user portal document events.

Formula:

```text
totalEvents = trackerEventCount + documentEventCount
```

Tracker event count:

```text
COUNT(events.id)
WHERE events.project_id = projectId
```

Document event count:

```text
COUNT(document_events.id)
WHERE project_enrollments.project_id = projectId
AND document_events.document_id = project_enrollments.submission_document_id
```

Filters:

- tracker events use `events.timestamp`, `sessions.external_user_id`,
  `events.event_type`
- document events use `document_events.timestamp`, `users.email`,
  `document_events.event_type`

### totalSessions

Total session count from both tracker sessions and derived document sessions.

Formula:

```text
totalSessions = trackerSessionCount + documentSessionCount
```

Tracker session count:

```text
COUNT(sessions.id)
WHERE sessions.project_id = projectId
```

Document session count:

```text
COUNT(DISTINCT document_events.document_id)
WHERE project_enrollments.project_id = projectId
AND document_events.document_id = project_enrollments.submission_document_id
```

Important: a linked project submission document only counts as a document
session after it has at least one `document_events` row.

### uniqueUsers

Distinct active users across tracker sessions and derived document sessions.

Tracker identity:

```text
sessions.external_user_id
```

Document identity:

```text
users.email
```

Formula:

```text
uniqueUsers = COUNT(DISTINCT external_user_id_or_email)
```

Only users with at least one counted tracker session or one counted document
event are included.

### totalUsers

In the analytics summary endpoint, `totalUsers` currently uses the same value as
`uniqueUsers`.

Formula:

```text
totalUsers = uniqueUsers
```

Important distinction:

- Analytics summary `totalUsers` means active users present in analytics data.
- Project detail enrollment count means users enrolled in
  `project_enrollments`, whether or not they have generated events.

These are intentionally different concepts in the current implementation.

### avgEventsPerSession

Average event density across all counted sessions.

Formula:

```text
avgEventsPerSession = totalEvents / totalSessions
```

If `totalSessions = 0`, the value is `0`.

The result is rounded to 2 decimal places by SQL.

### avgSessionDuration

Average duration in seconds across tracker sessions and derived document
sessions.

Tracker duration:

```text
COALESCE(session_end, NOW()) - session_start
```

Document duration:

```text
MAX(document_events.timestamp) - MIN(document_events.timestamp)
```

Formula:

```text
avgSessionDuration = AVG(all_session_duration_seconds)
```

If there are no sessions, the value is `0`.

The result is rounded to 2 decimal places by SQL.

### completionRate

Percentage of sessions marked submitted.

Formula:

```text
completionRate = submittedSessionCount / totalSessions * 100
```

Submitted tracker sessions:

```text
sessions.submitted = true
```

Derived document sessions:

```text
submitted = false
```

Because document sessions are currently always `submitted = false`, user portal
submission activity can increase `totalSessions` without increasing
`submittedSessionCount`.

If `totalSessions = 0`, the value is `0`.

The result is rounded to 2 decimal places by SQL.

### activeUsers24h

Distinct users whose counted session started in the last 24 hours.

Tracker session start:

```text
sessions.session_start
```

Document session start:

```text
MIN(document_events.timestamp)
```

Formula:

```text
COUNT(DISTINCT user)
WHERE session_start >= NOW() - INTERVAL '24 hours'
```

## Events Timeline

Endpoint:

```text
GET /api/v1/projects/:projectId/analytics/events-timeline
```

Returned data:

```text
{
  groupBy,
  timeline: [{ date, eventCount }]
}
```

The timeline counts both tracker events and document events, grouped by event
timestamp.

Source timestamps:

- tracker: `events.timestamp`
- document: `document_events.timestamp`

Grouping:

```text
groupBy=hour -> time_bucket('1 hour', timestamp)
groupBy=day  -> time_bucket('1 day', timestamp)
groupBy=week -> time_bucket('1 week', timestamp)
```

Date formatting:

```text
hour -> YYYY-MM-DD HH24:00:00
day  -> YYYY-MM-DD
week -> IYYY-IW
```

Formula per bucket:

```text
eventCount = COUNT(all_events_in_bucket)
```

Filters:

- `startDate`
- `endDate`
- `externalUserId`
- `eventType`

## Event Type Distribution

Endpoint:

```text
GET /api/v1/projects/:projectId/analytics/event-types
```

Returned data:

```text
{
  eventTypes: [{ eventType, count, percentage }],
  total
}
```

The distribution combines tracker events and document events.

Event type sources:

- tracker: `events.event_type`
- document: `document_events.event_type`

Count formula:

```text
count(eventType) = COUNT(events where event_type = eventType)
```

Percentage formula:

```text
percentage = count(eventType) / totalEventCount * 100
```

The result is rounded to 2 decimal places by SQL.

Sort order:

```text
ORDER BY count DESC
```

Filters:

- `startDate`
- `endDate`
- `externalUserId`
- `eventType`

## User Activity

Endpoint:

```text
GET /api/v1/projects/:projectId/analytics/users
```

Returned data:

```text
{
  users: [
    {
      externalUserId,
      sessionCount,
      eventCount,
      lastActive,
      avgDuration
    }
  ],
  total,
  page,
  limit,
  totalPages
}
```

This endpoint aggregates activity by user, combining tracker session stats and
document session stats.

### externalUserId

Tracker identity:

```text
sessions.external_user_id
```

Document identity:

```text
users.email
```

### sessionCount

Tracker session count:

```text
COUNT(DISTINCT sessions.id)
```

Document session count:

```text
COUNT(DISTINCT document_events.document_id)
```

Combined formula:

```text
sessionCount = trackerSessionCount + documentSessionCount
```

### eventCount

Tracker event count:

```text
COUNT(events.id)
LEFT JOIN events ON events.session_id = sessions.id
```

Document event count:

```text
COUNT(document_events.id)
```

Combined formula:

```text
eventCount = trackerEventCount + documentEventCount
```

### lastActive

Tracker last active:

```text
MAX(sessions.session_start)
```

Document last active:

```text
MAX(document_events.timestamp)
```

Combined formula:

```text
lastActive = MAX(trackerLastActive, documentLastActive)
```

Important: tracker user activity currently uses `sessions.session_start`, not
the latest tracker event timestamp.

### avgDuration

Tracker average duration:

```text
AVG(COALESCE(session_end, NOW()) - session_start)
```

Document average duration:

```text
AVG(MAX(document_events.timestamp) - MIN(document_events.timestamp))
GROUPED BY document_id
```

Combined formula:

```text
avgDuration = AVG(trackerAvgDuration, documentAvgDuration)
```

Important: this is an average of the source-level averages after unioning
tracker and document user stats. It is not currently weighted by each source's
session count.

### total

Total number of distinct users in the filtered result set.

Formula:

```text
COUNT(DISTINCT external_user_id_or_email)
```

### Pagination

The endpoint clamps invalid pagination values:

```text
page < 1  -> page = 1
limit < 1 -> limit = 20
limit > 100 -> limit = 100
```

Offset:

```text
offset = (page - 1) * limit
```

Sort order:

```text
ORDER BY lastActive DESC
```

## Session List

Endpoint:

```text
GET /api/v1/projects/:projectId/analytics/sessions
```

This endpoint currently reads only tracker sessions from the `sessions` table
through `SessionModel.findByProjectId`.

It does not include derived document sessions from user portal submission
documents.

Supported filters:

- `externalUserId`
- `startDate`
- `endDate`
- `submitted`
- `limit`
- `offset`

The total count also comes from `SessionModel.countByProjectId`, so it is
tracker-only.

## Session Details

Endpoint:

```text
GET /api/v1/projects/:projectId/analytics/sessions/:sessionId
```

This endpoint currently reads only real tracker sessions from the `sessions`
table.

It does not support derived document sessions because those do not have rows in
the `sessions` table.

Returned session duration:

```text
session_end - session_start
```

If `session_end` is null:

```text
NOW() - session_start
```

Returned events:

```text
SELECT * FROM events WHERE session_id = sessionId ORDER BY timestamp ASC
```

## Caching

Analytics responses are cached in Redis.

Default TTL:

```text
300 seconds
```

Summary cache key:

```text
analytics:{projectId}:summary:{filtersJson}
```

Timeline cache key:

```text
analytics:{projectId}:timeline:{groupBy}:{filtersJson}
```

Event types cache key:

```text
analytics:{projectId}:event-types:{filtersJson}
```

User activity cache key:

```text
analytics:{projectId}:users:{page}:{limit}:{filtersJson}
```

Session details cache key:

```text
analytics:session:{sessionId}
```

Session details use a shorter TTL:

```text
60 seconds
```

## Cache Invalidation

Project analytics cache is deleted by pattern:

```text
analytics:{projectId}:*
```

Current invalidation triggers:

- user joins a project
- user leaves a project
- enrollment is linked to a submission document
- document events are tracked for a linked submission document
- a linked submission document is deleted
- project is deleted

## Current Caveats

### Enrollment Count vs Analytics totalUsers

Enrollment count and analytics `totalUsers` are different:

- enrollment count: users in `project_enrollments`
- analytics `totalUsers`: users with counted tracker sessions or counted
  document events

A user who enrolled but never opened or edited the submission document may count
in enrollment count but not in analytics `totalUsers`.

### Document Sessions Are Derived

User portal submission sessions are derived from document events. They are not
stored in the `sessions` table.

Consequences:

- They are included in summary, timeline, event type distribution, and user
  activity.
- They are not included in `/analytics/sessions`.
- They cannot be opened through `/analytics/sessions/:sessionId`.

### User Activity avgDuration Is Not Weighted

When a user has both tracker activity and document activity, `avgDuration` is
currently the average of the tracker aggregate duration and document aggregate
duration. It is not weighted by session count.

### Tracker lastActive Uses Session Start

For tracker data in user activity, `lastActive` is based on
`MAX(sessions.session_start)`, not the latest tracker event timestamp.

### Document Completion Is Always False

Derived document sessions currently have `submitted = false`, so they do not
increase `completionRate`.

