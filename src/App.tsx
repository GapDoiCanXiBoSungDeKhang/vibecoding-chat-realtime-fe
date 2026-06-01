import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ChatPage from "./pages/ChatPage";
import ChatPlaceholder from "./pages/ChatPlaceholder";
import ChatContent from "./pages/ChatContent";
import ContactsPage from "./pages/ContactsPage";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";

// bo bao ve tuyen duong can dang nhap
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

// bo bao ve tuyen duong cong khai
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    if (isAuthenticated) {
        return <Navigate to="/chat" replace />;
    }
    return <>{children}</>;
};

function App() {
    return (
        <BrowserRouter>
            <div className="App">
                <Toaster
                    position="top-right"
                    reverseOrder={false}
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: "#363636",
                            color: "#fff",
                            borderRadius: "10px",
                            fontSize: "14px",
                        },
                    }}
                />
                <Routes>
                    {/* tuyen duong cong khai */}
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <AuthPage />
                            </PublicRoute>
                        }
                    />

                    {/* tuyen duong chinh: chatPage la layout shell, cac trang con render qua outlet */}
                    <Route
                        path="/chat"
                        element={
                            <ProtectedRoute>
                                <ChatPage />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<ChatPlaceholder />} />
                        <Route path=":chatId" element={<ChatContent />} />
                    </Route>

                    {/* trang danh ba ban be: dung chung layout chatPage */}
                    <Route
                        path="/friends"
                        element={
                            <ProtectedRoute>
                                <ChatPage />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<ContactsPage />} />
                    </Route>

                    {/* redirect duong dan cu /friend sang /friends */}
                    <Route
                        path="/friend"
                        element={<Navigate to="/friends" replace />}
                    />

                    {/* mac dinh */}
                    <Route
                        path="/"
                        element={<Navigate to="/chat" replace />}
                    />
                    <Route
                        path="*"
                        element={<Navigate to="/" replace />}
                    />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
