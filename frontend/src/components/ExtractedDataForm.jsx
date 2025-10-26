import { useState } from "react";
import { CheckCircle, X } from "lucide-react";

export default function ExtractedDataForm({ initialData, theme = "light", onSubmit, onDiscard, isSubmitting = false }) {
  const [formData, setFormData] = useState({
    patientName: initialData?.patientName || "",
    age: initialData?.age || "",
    gender: initialData?.gender || "",
    chiefComplaint: initialData?.chiefComplaint || "",
    symptoms: initialData?.symptoms || "",
    previousDiagnosis: initialData?.previousDiagnosis || "",
    previousMedications: initialData?.previousMedications || "",
    otherInfo: initialData?.otherInfo || ""
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.patientName.trim()) {
      newErrors.patientName = "Patient name is required";
    }
    
    if (formData.age && (isNaN(formData.age) || parseInt(formData.age) < 0 || parseInt(formData.age) > 150)) {
      newErrors.age = "Please enter a valid age (0-150)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const inputClasses = `w-full px-3 py-2 border rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    theme === "light"
      ? "bg-white border-gray-300 text-gray-900"
      : "bg-gray-800 border-gray-600 text-gray-100"
  }`;

  const labelClasses = `block text-sm font-medium mb-1 ${
    theme === "light" ? "text-gray-700" : "text-gray-300"
  }`;

  const errorClasses = "text-red-500 text-xs mt-1";

  return (
    <div
      className={`mt-8 text-left w-full max-w-2xl border rounded-lg p-6 ${
        theme === "light" ? "border-gray-200 bg-white" : "border-gray-700 bg-[#0f1419]"
      }`}
    >
      <h3 className="text-lg font-semibold mb-4">Review & Edit Extracted Data</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Name */}
        <div>
          <label htmlFor="patientName" className={labelClasses}>
            Patient Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="patientName"
            value={formData.patientName}
            onChange={(e) => handleChange("patientName", e.target.value)}
            className={inputClasses}
            placeholder="Enter patient name"
            disabled={isSubmitting}
          />
          {errors.patientName && <p className={errorClasses}>{errors.patientName}</p>}
        </div>

        {/* Age and Gender - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className={labelClasses}>
              Age <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="age"
              value={formData.age}
              onChange={(e) => handleChange("age", e.target.value)}
              className={inputClasses}
              placeholder="Enter age"
              disabled={isSubmitting}
            />
            {errors.age && <p className={errorClasses}>{errors.age}</p>}
          </div>

          <div>
            <label htmlFor="gender" className={labelClasses}>
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => handleChange("gender", e.target.value)}
              className={inputClasses}
              disabled={isSubmitting}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Chief Complaint */}
        <div>
          <label htmlFor="chiefComplaint" className={labelClasses}>
            Chief Complaint <span className="text-red-500">*</span>
          </label>
          <textarea
            id="chiefComplaint"
            value={formData.chiefComplaint}
            onChange={(e) => handleChange("chiefComplaint", e.target.value)}
            className={`${inputClasses} min-h-[80px] resize-y`}
            placeholder="Enter chief complaint"
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        {/* Symptoms */}
        <div>
          <label htmlFor="symptoms" className={labelClasses}>
            Symptoms
          </label>
          <textarea
            id="symptoms"
            value={formData.symptoms}
            onChange={(e) => handleChange("symptoms", e.target.value)}
            className={`${inputClasses} min-h-[80px] resize-y`}
            placeholder="Enter symptoms"
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        {/* Previous Diagnosis */}
        <div>
          <label htmlFor="previousDiagnosis" className={labelClasses}>
            Previous Diagnosis
          </label>
          <textarea
            id="previousDiagnosis"
            value={formData.previousDiagnosis}
            onChange={(e) => handleChange("previousDiagnosis", e.target.value)}
            className={`${inputClasses} min-h-[60px] resize-y`}
            placeholder="Enter previous diagnosis"
            disabled={isSubmitting}
            rows={2}
          />
        </div>

        {/* Previous Medications */}
        <div>
          <label htmlFor="previousMedications" className={labelClasses}>
            Previous Medications
          </label>
          <textarea
            id="previousMedications"
            value={formData.previousMedications}
            onChange={(e) => handleChange("previousMedications", e.target.value)}
            className={`${inputClasses} min-h-[60px] resize-y`}
            placeholder="Enter previous medications"
            disabled={isSubmitting}
            rows={2}
          />
        </div>

        {/* Other Info */}
        <div>
          <label htmlFor="otherInfo" className={labelClasses}>
            Other Information
          </label>
          <textarea
            id="otherInfo"
            value={formData.otherInfo}
            onChange={(e) => handleChange("otherInfo", e.target.value)}
            className={`${inputClasses} min-h-[80px] resize-y`}
            placeholder="Enter any other relevant information"
            disabled={isSubmitting}
            rows={3}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onDiscard}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center px-4 py-2 border rounded-lg transition ${
              theme === "light"
                ? "border-gray-300 hover:bg-gray-100 text-gray-700"
                : "border-gray-600 hover:bg-[#141b2e] text-gray-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <X className="w-4 h-4 mr-2" />
            Discard
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? "Saving..." : "Submit & Save"}
          </button>
        </div>
      </form>
    </div>
  );
}