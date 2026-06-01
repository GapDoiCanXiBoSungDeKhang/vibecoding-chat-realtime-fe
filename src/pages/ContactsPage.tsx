import React from "react";
import { useOutletContext } from "react-router-dom";
import ContactsView from "../components/chat/ContactsView";

const ContactsPage: React.FC = () => {
    const { handleStartChat } = useOutletContext<any>();

    return (
        <div className="flex-1 flex flex-col overflow-y-auto animate-in fade-in slide-in-from-right-2 duration-300">
            <ContactsView onStartChat={handleStartChat} />
        </div>
    );
};

export default ContactsPage;
