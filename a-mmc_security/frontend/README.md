# Frontend Security Integration

## ProtectedRoute.jsx
In App.jsx Routes:
```jsx
<Route element={<ProtectedRoute roles={['admin']}>
  <Route path="/admin" element={<AdminDashboard />} />
</ProtectedRoute>}
```

## UnauthorizedPage.jsx
Auto-rendered by ProtectedRoute on denial.

## useRoleGuard.js
```js
const { hasAccess } = useRoleGuard(['clinician', 'admin'])
if (!hasAccess) return null
```

Prevents direct URL access, shows custom error page.

