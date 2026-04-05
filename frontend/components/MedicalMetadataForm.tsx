"use client"

import { useState } from "react"
import { Trash2, CheckCircle2, Edit2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  MedicalMetadata,
  medicalMetadataLabels,
  medicalMetadataDescriptions,
} from "@/lib/medicalMetadata"

interface MedicalMetadataFormProps {
  data: MedicalMetadata
  onConfirm: (data: MedicalMetadata) => void
  onDelete: () => void
  isSubmitting?: boolean
}

export function MedicalMetadataForm({
  data,
  onConfirm,
  onDelete,
  isSubmitting = false,
}: MedicalMetadataFormProps) {
  const [editedData, setEditedData] = useState<MedicalMetadata>(data)
  const [isEditing, setIsEditing] = useState(false)

  const handleFieldChange = (field: keyof MedicalMetadata, value: string | number) => {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleConfirm = () => {
    onConfirm(editedData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedData(data)
    setIsEditing(false)
  }

  const textareaFields: (keyof MedicalMetadata)[] = [
    "chiefComplaint",
    "symptoms",
    "previousDiagnosis",
    "previousMedications",
    "allergies",
    "medication",
    "diagnosis",
  ]

  const numberFields: (keyof MedicalMetadata)[] = [
    "age",
    "bloodPressure",
    "heartRate",
    "temperature",
  ]

  return (
    <Card className="w-full border-border shadow-lg bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-4xl font-semibold">
              Medical Information Extracted
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Review and edit the extracted information from the recording
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={!!isSubmitting}
              className="gap-2 border-border"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>

      <Separator className="bg-border" />

      <CardContent className="pt-6">
        {/* Patient Basic Information */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Patient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Name */}
            <div className="space-y-2">
              <label className="text-base font-semibold text-foreground">
                {medicalMetadataLabels.patientName}
              </label>
              <p className="text-xs text-muted-foreground">
                {medicalMetadataDescriptions.patientName}
              </p>
              {isEditing ? (
                <Input
                  value={editedData.patientName}
                  onChange={(e) =>
                    handleFieldChange("patientName", e.target.value)
                  }
                  placeholder="Enter patient name"
                  className="border-border"
                />
              ) : (
                <div className="p-2 rounded-md bg-foreground/5 text-foreground min-h-9 flex items-center">
                  {data.patientName || "—"}
                </div>
              )}
            </div>

            {/* Age */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {medicalMetadataLabels.age}
              </label>
              <p className="text-xs text-muted-foreground">
                {medicalMetadataDescriptions.age}
              </p>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedData.age}
                  onChange={(e) => handleFieldChange("age", e.target.value)}
                  placeholder="Enter age"
                  className="border-border"
                />
              ) : (
                <div className="p-2 rounded-md bg-foreground/5 text-foreground min-h-9 flex items-center">
                  {data.age || "—"}
                </div>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                {medicalMetadataLabels.gender}
              </label>
              <p className="text-xs text-muted-foreground">
                {medicalMetadataDescriptions.gender}
              </p>
              {isEditing ? (
                <select
                  value={editedData.gender}
                  onChange={(e) => handleFieldChange("gender", e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              ) : (
                <div className="p-2 rounded-md bg-foreground/5 text-foreground min-h-9 flex items-center">
                  {data.gender || "—"}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Chief Complaint and Symptoms */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Chief Complaint & Symptoms</h3>
          <div className="space-y-6">
            {["chiefComplaint", "symptoms"].map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  {medicalMetadataLabels[field as keyof MedicalMetadata]}
                </label>
                <p className="text-xs text-muted-foreground">
                  {medicalMetadataDescriptions[field as keyof MedicalMetadata]}
                </p>
                {isEditing ? (
                  <Textarea
                    value={editedData[field as keyof MedicalMetadata]}
                    onChange={(e) => handleFieldChange(field as keyof MedicalMetadata, e.target.value)}
                    placeholder={`Enter ${medicalMetadataLabels[field as keyof MedicalMetadata].toLowerCase()}`}
                    className="border-border min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 rounded-md bg-foreground/5 text-foreground min-h-[100px] whitespace-pre-wrap overflow-auto">
                    {data[field as keyof MedicalMetadata] || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Vital Signs */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vital Signs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["bloodPressure", "heartRate", "temperature"].map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  {medicalMetadataLabels[field as keyof MedicalMetadata]}
                </label>
                <p className="text-xs text-muted-foreground">
                  {medicalMetadataDescriptions[field as keyof MedicalMetadata]}
                </p>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editedData[field as keyof MedicalMetadata]}
                    onChange={(e) => handleFieldChange(field as keyof MedicalMetadata, e.target.value)}
                    placeholder={`Enter ${medicalMetadataLabels[field as keyof MedicalMetadata].toLowerCase()}`}
                    className="border-border"
                  />
                ) : (
                  <div className="p-2 rounded-md bg-foreground/5 text-foreground min-h-9 flex items-center">
                    {data[field as keyof MedicalMetadata] || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Medical History */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Medical History</h3>
          <div className="space-y-6">
            {["previousDiagnosis", "previousMedications", "allergies"].map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  {medicalMetadataLabels[field as keyof MedicalMetadata]}
                </label>
                <p className="text-xs text-muted-foreground">
                  {medicalMetadataDescriptions[field as keyof MedicalMetadata]}
                </p>
                {isEditing ? (
                  <Textarea
                    value={editedData[field as keyof MedicalMetadata]}
                    onChange={(e) => handleFieldChange(field as keyof MedicalMetadata, e.target.value)}
                    placeholder={`Enter ${medicalMetadataLabels[field as keyof MedicalMetadata].toLowerCase()}`}
                    className="border-border min-h-[80px]"
                  />
                ) : (
                  <div className="p-3 rounded-md bg-foreground/5 text-foreground min-h-[80px] whitespace-pre-wrap overflow-auto">
                    {data[field as keyof MedicalMetadata] || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        {/* Assessment & Plan */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Assessment & Plan</h3>
          <div className="space-y-6">
            {["medication", "diagnosis"].map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-base font-semibold text-foreground">
                  {medicalMetadataLabels[field as keyof MedicalMetadata]}
                </label>
                <p className="text-xs text-muted-foreground">
                  {medicalMetadataDescriptions[field as keyof MedicalMetadata]}
                </p>
                {isEditing ? (
                  <Textarea
                    value={editedData[field as keyof MedicalMetadata]}
                    onChange={(e) => handleFieldChange(field as keyof MedicalMetadata, e.target.value)}
                    placeholder={`Enter ${medicalMetadataLabels[field as keyof MedicalMetadata].toLowerCase()}`}
                    className="border-border min-h-[100px]"
                  />
                ) : (
                  <div className="p-3 rounded-md bg-foreground/5 text-foreground min-h-[100px] whitespace-pre-wrap overflow-auto">
                    {data[field as keyof MedicalMetadata] || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      <Separator className="bg-border" />

      {/* Action Buttons */}
      <div className="p-6 flex gap-3 justify-end flex-wrap">
        {isEditing && (
          <>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={!!isSubmitting}
              className="gap-2 border-border"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={!!isSubmitting}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Confirm Changes"}
            </Button>
          </>
        )}

        {!isEditing && (
          <>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={!!isSubmitting}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Confirm"}
            </Button>
            <Button
              variant="outline"
              onClick={onDelete}
              disabled={!!isSubmitting}
              className="gap-2 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
