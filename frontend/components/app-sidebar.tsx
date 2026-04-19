"use client"
import { Calendar, Home, Notebook, User, Users, Mic, Stethoscope, MessageCircle } from "lucide-react"
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuAction,
  useSidebar,
} from '@/components/animate-ui/components/radix/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/animate-ui/components/radix/dropdown-menu';
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { usePathname } from "next/navigation";
import { useAuth } from "./auth/AuthContext";
import { createClient } from "@/lib/supabase-browser";

const items = [
    {
        title: "Home",
        url: "/dashboard",
        icon: Home,
    },
    {
        title: "Record Session",
        url: "/record-session",
        icon: Mic,
    },
    {
        title: "Appointments",
        url: "/appointments",
        icon: Calendar,
    },
    {
        title: "All Sessions",
        url: "/sessions",
        icon: Notebook,
    },
    {
        title: "All Patients",
        url: "/patients",
        icon: Users,
    },
    {
        title: "Chatbot",
        url: "/chatbot",
        icon: MessageCircle,
    },
]

export function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { session, signOut } = useAuth();
    const supabase = createClient();
    const { state, toggleSidebar } = useSidebar();
    const sidebarRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const [profile, setProfile] = useState<any>(null);
    const [recentSessions, setRecentSessions] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [wasHoverExpanded, setWasHoverExpanded] = useState(false);

    // Initialize sidebar state from localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-state');
        if (savedState && typeof window !== 'undefined') {
            // The state should be loaded from localStorage
            const currentState = localStorage.getItem('sidebar-state');
            if (currentState === 'collapsed' && state === 'expanded') {
                toggleSidebar();
            }
        }
    }, []);

    // Save sidebar state to localStorage whenever it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-state', state);
        }
    }, [state]);

    // Handle mouse enter on sidebar to expand when collapsed
    const handleMouseEnter = () => {
        if (state === 'collapsed') {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
            setWasHoverExpanded(true);
            toggleSidebar();
        }
    };

    // Handle mouse leave on sidebar to collapse if expanded via hover
    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        // Collapse after a short delay to avoid flickering
        hoverTimeoutRef.current = setTimeout(() => {
            // Only collapse if this expansion was due to hover and sidebar state is collapsed
            const savedState = localStorage.getItem('sidebar-state');
            if (wasHoverExpanded && savedState === 'collapsed' && state === 'expanded') {
                toggleSidebar();
                setWasHoverExpanded(false);
            }
        }, 300);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [session?.user?.id, supabase]);

    useEffect(() => {
        if (!session?.user?.id) {
            console.log('No session user ID yet');
            return;
        }

        const fetchRecentSessions = async () => {
            try {
                console.log('Fetching recent sessions for user:', session.user.id);
                const { data, error } = await supabase
                    .from('notes')
                    .select('noteID, patientName, createdAt')
                    .eq('user_id', session.user.id)
                    .order('createdAt', { ascending: false })
                    .limit(5);
                
                console.log('Response data:', data);
                console.log('Response error:', error);
                
                if (error) {
                    console.error('Supabase error:', error);
                }
                
                if (data && data.length > 0) {
                    console.log('Setting recent sessions:', data);
                    setRecentSessions(data);
                } else {
                    console.log('No data returned or empty array');
                    setRecentSessions([]);
                }
            } catch (error) {
                console.error('Error fetching recent sessions:', error);
            }
        };

        fetchRecentSessions();
    }, [session?.user?.id]);

    // Load recent chats from localStorage
    useEffect(() => {
        try {
            const stored = localStorage.getItem('recent_chats');
            if (stored) {
                const chats = JSON.parse(stored).slice(0, 5); // Limit to 5
                setRecentChats(chats);
            }
        } catch (error) {
            console.error('Error loading recent chats:', error);
        }
    }, []);

    const displayName = profile?.full_name || profile?.username || 'Dr. User';
    const displayProfession = profile?.profession || 'Healthcare Professional';

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };
            
    return (
        <Sidebar 
            ref={sidebarRef}
            collapsible="icon" 
            className="bg-sidebar border border-border drop-shadow"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <SidebarHeader className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground py-1">
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Stethoscope className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        HealthSync
                      </span>
                    </div>
                </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                        {items.map((item) => {
                            const isActive = pathname === item.url;

                            return (
                            <SidebarMenuItem key={item.title} className="py-0.5">
                                <SidebarMenuButton
                                asChild
                                className={isActive ? "bg-primary text-primary-foreground" : ""}
                                >
                                <Link href={item.url}>
                                    <item.icon />
                                    <span className="tracking-wide">{item.title}</span>
                                </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            );
                        })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <Separator className="my-2" />
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs">Recent Sessions</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {recentSessions.length > 0 ? (
                                recentSessions.map((session) => (
                                    <SidebarMenuItem key={session.noteID} className="py-0.5">
                                        <SidebarMenuButton
                                            asChild
                                            className="h-auto py-1.5 px-2"
                                            onClick={() => router.push(`/sessions/${session.noteID}`)}
                                        >
                                            <button className="flex flex-col items-start gap-0.5 w-full text-left">
                                                <span className="text-xs font-medium truncate w-full">
                                                    {session.patientName}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(session.createdAt)}
                                                </span>
                                            </button>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground px-2 py-2">
                                    No recent sessions
                                </div>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                <Separator className="my-2" />
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs">Recent Chats</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {recentChats.length > 0 ? (
                                recentChats.map((chat) => (
                                    <SidebarMenuItem key={chat.id} className="py-0.5">
                                        <SidebarMenuButton
                                            asChild
                                            className="h-auto py-1.5 px-2"
                                            onClick={() => router.push(`/chatbot?session=${chat.id}`)}
                                        >
                                            <button className="flex flex-col items-start gap-0.5 w-full text-left">
                                                <span className="text-xs font-medium truncate w-full">
                                                    {chat.title}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDate(chat.timestamp)}
                                                </span>
                                            </button>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))
                            ) : (
                                <div className="text-xs text-muted-foreground px-2 py-2">
                                    No recent chats
                                </div>
                            )}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
            {/* Nav User */}
            <SidebarMenu>
                <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                        <User className="h-8 w-8 rounded-lg"/>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                            {loading ? "Loading..." : displayName}
                        </span>
                        <span className="truncate text-xs">
                            {loading ? "..." : displayProfession}
                            </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4" />
                    </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg border-border shadow-md"
                    align="end"
                    sideOffset={4}
                    >
                    <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <User className="h-8 w-8 rounded-lg"/>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                            {displayName}
                            </span>
                            <span className="truncate text-xs">
                            {displayProfession}
                            </span>
                        </div>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => router.push('/upgrade')}>
                            <Sparkles />
                            Upgrade to Pro
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => router.push('/settings?tab=account')}>
                            <BadgeCheck />
                            Account
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings?tab=notifications')}>
                            <Bell />
                            Notifications
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/settings?tab=security')}>
                            <CreditCard />
                            Settings
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} variant="destructive">
                        <LogOut />
                        Log out
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
            {/* Nav User */}
        </SidebarFooter>
        </Sidebar>
    )
}