"use client";

import { DynamicBreadcrumbs } from "@/features/dynamic-breadcrumb";
import { SidebarTrigger } from "./animate-ui/components/radix/sidebar";
import { ModeToggle } from "./theme-provider";
import { useAuth } from "./auth/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

export function Navbar(){
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <>
            <nav className = "p-1 flex items-center justify-between relative">
                <div className="flex items-center gap-4">
                    <SidebarTrigger className="hover:bg-secondary"/>
                    <div data-orientation="vertical" role="none" className="shrink-0 bg-border h-full w-px mx-2 data-[orientation=vertical]:h-4"></div>
                <DynamicBreadcrumbs/>
                </div>
                <div className ="flex items-center gap-4 px-2">
                    <ModeToggle />
                    
                    {/* User Menu */}
                    {user && (
                        <div className="flex items-center gap-2 pl-2 border-l border-border">
                            <div className="text-sm text-muted-foreground flex flex-col items-end">
                                <p className="font-medium text-foreground">{user.email?.split('@')[0]}</p>
                                <p className="text-xs">{user.email}</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={handleLogout}
                                className="hover:bg-destructive/10"
                            >
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </nav>
            <div data-orientation="horizontal" role="none" className="mt-1 relative bottom-0 shrink-0 bg-border h-px w-full data-[orientation=horizontal]:h-0.5"></div>
        </>
    );
};
