"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import RecordProvider from "@/components/recording-provider"

export default function RecordSession() {
    const [showMetadataForm, setShowMetadataForm] = useState(false)

    return (
            <>
                <div className = "py-5 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                    <div className="w-full size-10 p-2 gap-2">   
                        <h1 className="text-4xl text-foreground">Record Session</h1>
                        <h3 className="text-lg text-muted-foreground">Start Recording a new session</h3>
                    </div>
                </div>
                <div className = {`py-10 grid gap-4 w-full ${
                  showMetadataForm
                    ? "grid-cols-1"
                    : "grid-cols-1 md:grid-cols-[2fr_1fr]"
                }`}>
                        <RecordProvider onMetadataStateChange={setShowMetadataForm} />
                    {!showMetadataForm && (
                      <Card className="border drop-shadow border-border bg-card">
                          <CardHeader>
                              <CardTitle className="text-xl font-semibold">
                              Recording Guidelines
                              </CardTitle>
                              <CardDescription className="text-lg">
                              Follow these steps to ensure clear and accurate audio capture.
                              </CardDescription>
                          </CardHeader>

                          <CardContent className="space-y-3 text-muted-foreground">
                              <ul className="list-disc pl-4 space-y-2">
                              <li>Select the correct microphone before starting.</li>
                              <li>Speak clearly at a steady pace and normal volume.</li>
                              <li>Minimize background noise during recording.</li>
                              <li>Pause briefly between sentences for better clarity.</li>
                              <li>Review the recording before confirming.</li>
                              </ul>
                          </CardContent>
                      </Card>
                    )}
                </div>
            </>
    )
}