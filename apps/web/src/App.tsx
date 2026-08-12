import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import AppShell from "./pages/AppShell";
import LoginPage from "./pages/LoginPage";
import ReportsPage from "./pages/ReportsPage";
import ViewPage from "./pages/ViewPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: "inbox", element: <ViewPage /> },
      { path: "today", element: <ViewPage /> },
      { path: "week", element: <ViewPage /> },
      { path: "all", element: <ViewPage /> },
      { path: "completed", element: <ViewPage /> },
      { path: "list/:id", element: <ViewPage /> },
      { path: "tag/:id", element: <ViewPage /> },
      { path: "search", element: <ViewPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "*", element: <Navigate to="/today" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
