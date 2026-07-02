import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
    children: React.ReactNode;
    isMine?: boolean;
}

interface State {
    hasError: boolean;
}

/**
 * Bọc phần render nội dung 1 tin nhắn (voice, media, call, link preview...).
 * Nếu có lỗi runtime (data không đúng shape, thiếu field...), hiện fallback
 * rõ ràng thay vì để React unmount silently — trước đây gây ra hiện tượng
 * "tin nhắn biến thành cục tròn trống" mà không rõ nguyên nhân, phải F5 mới
 * thấy lại đúng (F5 tải lại từ API với data đã chuẩn hoá nên không lỗi).
 */
class MessageErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[MessageErrorBoundary] render error:", error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs ${
                        this.props.isMine
                            ? "bg-white/10 text-white/70"
                            : "bg-gray-100 text-gray-500"
                    }`}
                >
                    <AlertTriangle size={13} />
                    Không thể hiển thị tin nhắn này
                </div>
            );
        }
        return this.props.children;
    }
}

export default MessageErrorBoundary;
