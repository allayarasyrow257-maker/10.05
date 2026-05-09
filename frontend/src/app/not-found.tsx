import { Frown } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground select-none">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-2xl">
                <Frown size={48} className="text-purple-500" />
            </div>
            <h1 className="text-8xl font-black mb-4 bg-gradient-to-br from-white to-gray-500 bg-clip-text text-transparent">
                404
            </h1>
            <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
            <p className="text-muted-foreground text-center max-w-md">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
        </div>
    );
}
