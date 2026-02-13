# Page Usage Statistics - Requirements Document

## Overview
This document defines the requirements for implementing page usage statistics in the Chorleiter admin dashboard, allowing administrators to understand how users interact with the application.

## Business Objectives
1. **User Behavior Insights**: Understand which features are most/least used
2. **Performance Monitoring**: Identify pages that need optimization
3. **Feature Validation**: Validate which features provide value to users
4. **Resource Planning**: Make data-driven decisions about feature development
5. **User Engagement**: Track user activity patterns and engagement levels

## Core Requirements

### 1. Data Collection (Backend)

#### 1.1 Page View Tracking
**Priority**: High

Track every page navigation with:
- **User ID**: Which user accessed the page (nullable for anonymous)
- **Choir ID**: Which choir context (nullable for global pages)
- **Route/Path**: The Angular route path (e.g., `/pieces/list`, `/admin/users`)
- **Page Title**: Human-readable page title
- **Timestamp**: When the page was accessed (UTC)
- **Session ID**: Group page views by session
- **User Agent**: Browser/device information
- **Referrer**: Previous page (internal navigation tracking)
- **Load Time**: Page load duration (client-side measurement)

#### 1.2 User Session Tracking
**Priority**: Medium

Track user sessions with:
- **Session ID**: Unique session identifier
- **User ID**: Associated user
- **Start Time**: Session start
- **End Time**: Session end or last activity
- **Duration**: Calculated session duration
- **Page Count**: Number of pages viewed in session
- **Device Type**: Mobile/Tablet/Desktop

#### 1.3 Action Tracking (Optional Enhancement)
**Priority**: Low

Track specific user actions:
- Button clicks (e.g., "Export", "Print", "Add New")
- Form submissions
- Search queries
- Filter applications
- Download actions

### 2. Data Storage

#### 2.1 Database Schema

**Table: `page_views`**
```sql
CREATE TABLE page_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  choir_id INTEGER REFERENCES choirs(id) ON DELETE SET NULL,
  session_id VARCHAR(255) NOT NULL,
  route VARCHAR(500) NOT NULL,
  page_title VARCHAR(255),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  referrer VARCHAR(500),
  load_time_ms INTEGER,
  device_type VARCHAR(50),
  INDEX idx_user_id (user_id),
  INDEX idx_choir_id (choir_id),
  INDEX idx_timestamp (timestamp),
  INDEX idx_route (route),
  INDEX idx_session_id (session_id)
);
```

**Table: `user_sessions`**
```sql
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  duration_seconds INTEGER,
  page_count INTEGER DEFAULT 0,
  device_type VARCHAR(50),
  user_agent TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_session_id (session_id),
  INDEX idx_start_time (start_time)
);
```

#### 2.2 Data Retention
- **Active Data**: Keep last 90 days in main table
- **Archived Data**: Move older data to archive table or aggregate
- **Aggregated Stats**: Pre-calculate daily/weekly/monthly stats
- **Cleanup Job**: Scheduled task to manage data retention

### 3. Privacy & Security

#### 3.1 GDPR Compliance
- **Anonymization**: Option to anonymize user data after N days
- **User Consent**: Inform users about tracking (privacy policy)
- **Data Export**: Allow users to export their own usage data
- **Right to Deletion**: Support user data deletion requests
- **IP Anonymization**: Do NOT store IP addresses

#### 3.2 Data Access
- **Admin Only**: Only users with admin role can view statistics
- **Choir Filtering**: Choir directors might see their choir's stats only (optional)
- **Sensitive Routes**: Option to exclude certain routes from tracking (e.g., `/admin/security`)

### 4. Frontend Visualization (Admin Dashboard)

#### 4.1 Dashboard Overview Widget
**Location**: Admin Dashboard main page

Display:
- **Total Page Views**: Last 7/30/90 days
- **Unique Users**: Daily/Weekly/Monthly active users
- **Average Session Duration**: Minutes per session
- **Most Popular Pages**: Top 10 pages by views
- **Trend Indicator**: % change from previous period
- **Live Users**: Current active users (optional)

#### 4.2 Detailed Analytics Page
**Location**: `/admin/usage-analytics`

**Page Structure**:

##### A. Summary Cards
- Total Views (with trend)
- Unique Users (with trend)
- Avg Session Duration (with trend)
- Bounce Rate (single-page sessions %)

##### B. Time Series Chart
- **Type**: Line/Area chart
- **X-Axis**: Time (hourly, daily, weekly, monthly)
- **Y-Axis**: Page views / Unique users (switchable)
- **Time Range Selector**: 7d, 30d, 90d, Custom
- **Granularity**: Auto-adjust (hourly for 7d, daily for 30d, etc.)

##### C. Top Pages Table
**Columns**:
- Page Title
- Route
- Page Views
- Unique Users
- Avg Time on Page
- Bounce Rate
- Trend (↑↓)

**Features**:
- Sortable columns
- Search/filter
- Pagination (10/25/50 per page)
- Export to CSV

##### D. User Activity Heatmap
- **Visualization**: Calendar heatmap or hourly grid
- **Shows**: Activity distribution by day/hour
- **Use Case**: Identify peak usage times

##### E. Session Analytics
- **Avg Pages per Session**: Histogram
- **Session Duration Distribution**: Chart
- **Common Entry Pages**: Top 10
- **Common Exit Pages**: Top 10

##### F. Route Category Breakdown
- **Group routes** by feature area (e.g., Pieces, Planning, Admin, Literature)
- **Pie/Donut Chart**: Views by category
- **Bar Chart**: Comparison across categories

##### G. Device & Browser Statistics
- Device breakdown (Mobile/Tablet/Desktop)
- Browser distribution
- OS distribution

#### 4.3 Page-Specific Analytics
**Context**: Show analytics for specific pages

**Example**: On `/pieces/list`, show small widget:
- "This page was viewed X times in the last 30 days"
- "Top filters used: [filter names]"

### 5. Frontend Implementation

#### 5.1 Analytics Service
```typescript
// choir-app-frontend/src/app/core/services/analytics.service.ts
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  trackPageView(route: string, title: string): void
  trackEvent(category: string, action: string, label?: string): void
  getSessionId(): string
  getDeviceType(): string
}
```

#### 5.2 Route Tracking Integration
- Use Angular Router events to auto-track page views
- Implement in `app.component.ts` or dedicated analytics initialization
- Measure navigation performance timing

#### 5.3 Admin Analytics Component
```typescript
// New component: AdminUsageAnalyticsComponent
// Location: choir-app-frontend/src/app/features/admin/usage-analytics/
```

### 6. Backend Implementation

#### 6.1 API Endpoints

**Analytics Data Collection**:
```
POST /api/analytics/pageview
POST /api/analytics/event
POST /api/analytics/session/start
PUT  /api/analytics/session/end
```

**Analytics Retrieval (Admin Only)**:
```
GET  /api/admin/analytics/summary?period=7d
GET  /api/admin/analytics/pageviews?start=2026-01-01&end=2026-02-01
GET  /api/admin/analytics/top-pages?limit=10&period=30d
GET  /api/admin/analytics/sessions?start=2026-01-01&end=2026-02-01
GET  /api/admin/analytics/device-stats?period=30d
GET  /api/admin/analytics/export?format=csv&start=...&end=...
```

#### 6.2 Middleware
- Request context middleware to track API calls
- Rate limiting on analytics endpoints to prevent abuse
- Async processing (queue) for high-volume tracking

#### 6.3 Services
```javascript
// choir-app-backend/src/services/analytics.service.js
class AnalyticsService {
  recordPageView(data)
  getPageViewStats(startDate, endDate, filters)
  getTopPages(period, limit)
  getSessionStats(startDate, endDate)
  getDeviceBreakdown(period)
  exportAnalytics(format, filters)
}
```

### 7. Performance Considerations

#### 7.1 Client-Side
- **Async Tracking**: Don't block UI for analytics calls
- **Batching**: Batch multiple events before sending
- **Error Handling**: Failed analytics calls shouldn't break app
- **Debouncing**: Avoid duplicate events

#### 7.2 Server-Side
- **Async Processing**: Use message queue for high-volume writes
- **Database Optimization**: Proper indexes on frequently queried columns
- **Caching**: Cache aggregated stats (Redis/NodeCache)
- **Aggregation**: Pre-calculate daily/weekly/monthly stats

#### 7.3 Database
- **Partitioning**: Partition by timestamp for large datasets
- **Archiving**: Move old data to separate tables
- **Read Replicas**: Use read replicas for analytics queries (if needed)

### 8. Metrics Definitions

#### 8.1 Key Metrics

**Page Views**: Total number of page loads

**Unique Users**: Count of distinct users (by user_id) in period

**Active Users**:
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)

**Session Duration**: Time from first page view to last in session

**Bounce Rate**: % of single-page sessions

**Avg Time on Page**: Average duration between page entry and next navigation

**Retention**: % of users who return after N days

**Popular Pages**: Pages sorted by view count

**Entry Pages**: First page in session

**Exit Pages**: Last page in session

**Conversion Funnels** (optional): Track user paths through multi-step processes

### 9. Reporting Features

#### 9.1 Scheduled Reports (Future Enhancement)
- **Email Reports**: Weekly/Monthly summary to admins
- **Saved Filters**: Save custom analytics views
- **Alerts**: Notify on unusual patterns (spike/drop in usage)
- **Comparisons**: Compare periods (this week vs last week)

#### 9.2 Export Options
- CSV export for all tables
- PDF report generation (summary + charts)
- API for third-party integrations

### 10. Implementation Phases

#### Phase 1: Foundation (MVP)
- Database schema creation
- Basic page view tracking (backend API)
- Analytics service integration (frontend)
- Simple dashboard widget showing:
  - Total views (7/30 days)
  - Top 10 pages
  - Daily view chart

#### Phase 2: Enhanced Analytics
- Session tracking
- Device/browser stats
- Detailed analytics page with charts
- Time series visualization
- Export to CSV

#### Phase 3: Advanced Features
- User journey/funnel analysis
- Heatmaps and activity patterns
- Event tracking for specific actions
- Scheduled reports
- Real-time dashboard updates

#### Phase 4: Optimization & Intelligence
- Predictive analytics
- Anomaly detection
- Automated insights ("Page X usage dropped 50%")
- A/B testing support

### 11. Success Criteria

The implementation is successful when:

1. **Data Accuracy**: 95%+ page views are tracked accurately
2. **Performance**: Analytics tracking adds <50ms to page load
3. **Data Privacy**: GDPR compliant, no PII stored without consent
4. **Usability**: Admins can answer key questions in <30 seconds:
   - What are our most popular features?
   - How many active users do we have?
   - What's our user growth trend?
5. **Reliability**: Analytics system uptime >99%
6. **Scalability**: System handles 10,000+ daily page views without degradation

### 12. Non-Functional Requirements

#### 12.1 Performance
- Analytics API response time <200ms (p95)
- Dashboard page load time <2 seconds
- Database queries optimized with proper indexes

#### 12.2 Security
- All analytics endpoints require admin authentication
- No exposure of individual user behavior (aggregate only)
- SQL injection prevention through parameterized queries

#### 12.3 Maintainability
- Clear documentation of tracking implementation
- Automated tests for analytics service
- Data retention policy documented and automated

#### 12.4 Scalability
- Support for 100,000+ page views per day
- Horizontal scaling capability for API layer
- Database partitioning strategy for growth

### 13. Open Questions to Clarify

Before implementation, clarify:

1. **Privacy Level**: Should admins see individual user behavior or only aggregates?
2. **Choir-Level Access**: Should choir directors see their choir's analytics?
3. **Tracking Scope**: Track only logged-in users or also anonymous visitors?
4. **Data Retention**: How long should raw data be kept?
5. **Real-Time Requirements**: Need live dashboard updates or daily refresh is OK?
6. **Third-Party Tools**: Consider existing tools (Google Analytics, Matomo) vs custom?
7. **Budget**: Any constraints on database storage or API calls?
8. **Compliance**: Any specific regulatory requirements (GDPR, HIPAA, etc.)?

### 14. Alternative Approaches

#### Option A: Custom Implementation (Recommended)
**Pros**: Full control, privacy-friendly, integrated with existing auth
**Cons**: Development effort, maintenance overhead

#### Option B: Self-Hosted Analytics (Matomo, Plausible)
**Pros**: Feature-rich, proven, GDPR compliant
**Cons**: Additional infrastructure, migration effort

#### Option C: Cloud Analytics (Google Analytics 4)
**Pros**: Free, powerful, no maintenance
**Cons**: Privacy concerns, less control, external dependency

#### Option D: Hybrid Approach
**Pros**: Best of both worlds
**Implementation**: Use custom tracking for sensitive data, external tool for general usage

### 15. Technical Decisions Needed

- [ ] Database: Add new tables or use existing audit/logging infrastructure?
- [ ] Frontend Charting Library: Chart.js, D3.js, or Angular Material Charts?
- [ ] Real-Time Updates: WebSocket, SSE, or polling?
- [ ] Caching Strategy: Redis or NodeCache for aggregated stats?
- [ ] Queue System: Bull, RabbitMQ, or simple async functions?

## Next Steps

1. **Review & Approve** this requirements document
2. **Answer open questions** in section 13
3. **Choose implementation approach** from section 14
4. **Prioritize features** for Phase 1 (MVP)
5. **Create technical design document**
6. **Estimate development effort**
7. **Begin Phase 1 implementation**

---

**Document Status**: Draft for Review
**Created**: 2026-02-13
**Author**: Development Team
**Review Required**: Product Owner, Admin Users
