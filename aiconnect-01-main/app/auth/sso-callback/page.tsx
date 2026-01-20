export default function SSOCallback() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}
