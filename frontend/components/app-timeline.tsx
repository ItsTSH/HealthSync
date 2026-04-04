"use client";

import React, { useEffect, useState } from "react";
import { Timeline } from "./ui/timeline";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/components/auth/AuthContext";

interface Note {
  noteID: string
  patientName: string
  createdAt: string
  chiefComplaint: string
}

export function TimelineComponent(){
    const { session } = useAuth();
    const supabase = createClient();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session?.user?.id) return;

        const fetchNotes = async () => {
            try {
                const { data: notes, error } = await supabase
                    .from('notes')
                    .select('noteID, patientName, createdAt, chiefComplaint')
                    .eq('user_id', session.user.id)
                    .order('createdAt', { ascending: false })
                    .limit(5);

                if (error) throw error;

                const timelineData = notes?.map((note: Note, index: number) => ({
                    title: String(index + 1),
                    content: (
                        <Card className="border drop-shadow bg-secondary hover:bg-background border-border">
                            <CardHeader className="text-card-foreground">{note.patientName}</CardHeader>
                            <CardContent>
                                <div className="text-1xl text-card-foreground">
                                    <h3 className="text-muted-foreground">
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </h3>
                                    <h3 className="py-1 text-muted-foreground">{note.chiefComplaint}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    ),
                })) || [];

                setData(timelineData);
            } catch (error) {
                console.error('Error fetching notes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, [session?.user?.id, supabase]);

    if (loading) {
        return <div className="text-muted-foreground">Loading sessions...</div>;
    }

    if (data.length === 0) {
        return <div className="text-muted-foreground">No sessions yet</div>;
    }

    return (
        <div className="relative w-full overflow-y-auto h-full translate-y-[-10%]">
            <Timeline data={data}/>
        </div>
    )
}