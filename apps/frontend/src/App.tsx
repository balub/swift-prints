import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { RealTimeProvider } from "@/contexts/RealTimeContext";
import { Navbar } from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatusIndicator from "@/components/NetworkStatusIndicator";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { UserRole } from "@/types/api";
import ErrorHandler from "@/lib/error-handler";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const PrintStudio = lazy(() => import("./pages/PrintStudio"));
const CostEstimate = lazy(() => import("./pages/CostEstimate"));
const Makers = lazy(() => import("./pages/Makers"));
const MakerDashboard = lazy(() => import("./pages/MakerDashboard"));
const Order = lazy(() => import("./pages/Order"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (error: any) => {
        // Handle query errors globally
        const userFriendlyError = ErrorHandler.handleApiError(error);
        ErrorHandler.logError(error, "react_query");

        // Only show toast for non-auth errors (auth errors are handled by AuthContext)
        if (error?.response?.status !== 401) {
          ErrorHandler.showErrorToast(userFriendlyError);
        }
      },
    },
    mutations: {
      onError: (error: any) => {
        // Handle mutation errors globally
        const userFriendlyError = ErrorHandler.handleApiError(error);
        ErrorHandler.logError(error, "react_query_mutation");

        // Mutations usually handle their own error display, so we just log
      },
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealTimeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen bg-background">
                {/* Network status indicator */}
                <div className="fixed top-0 left-0 right-0 z-50">
                  <NetworkStatusIndicator />
                </div>

                <Routes>
                  {/* Public routes */}
                  <Route
                    path="/"
                    element={
                      <Suspense
                        fallback={
                          <div className="min-h-screen flex items-center justify-center">
                            <LoadingSpinner />
                          </div>
                        }
                      >
                        <Navbar />
                        <Landing />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/login"
                    element={
                      <Suspense
                        fallback={
                          <div className="min-h-screen flex items-center justify-center">
                            <LoadingSpinner />
                          </div>
                        }
                      >
                        <Login />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/signup"
                    element={
                      <Suspense
                        fallback={
                          <div className="min-h-screen flex items-center justify-center">
                            <LoadingSpinner />
                          </div>
                        }
                      >
                        <SignUp />
                      </Suspense>
                    }
                  />

                  {/* Protected routes */}
                  <Route
                    path="/studio"
                    element={
                      <ProtectedRoute>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <PrintStudio />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/cost-estimate"
                    element={
                      <ProtectedRoute>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <CostEstimate />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/makers"
                    element={
                      <ProtectedRoute>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <Makers />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/order"
                    element={
                      <ProtectedRoute>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <Order />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <Orders />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <ProtectedRoute>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <OrderDetail />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />

                  {/* Maker routes */}
                  <Route
                    path="/maker/dashboard"
                    element={
                      <ProtectedRoute requiredRole={UserRole.MAKER}>
                        <Suspense
                          fallback={
                            <div className="min-h-screen flex items-center justify-center">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <Navbar />
                          <MakerDashboard />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch all */}
                  <Route
                    path="*"
                    element={
                      <Suspense
                        fallback={
                          <div className="min-h-screen flex items-center justify-center">
                            <LoadingSpinner />
                          </div>
                        }
                      >
                        <NotFound />
                      </Suspense>
                    }
                  />
                </Routes>
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </RealTimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
