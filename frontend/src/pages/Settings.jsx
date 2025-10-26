// import React, { useState } from "react";
// import Layout from "../components/Layout";

// export default function Settings({ theme = "light" }) {
//   const [notifications, setNotifications] = useState(true);
//   const [emailUpdates, setEmailUpdates] = useState(false);
//   const [autoSave, setAutoSave] = useState(true);
//   const [language, setLanguage] = useState("en");

//   const handleProfileEdit = () => {
//     alert("Profile Edit clicked!");
//   };

//   const handleLogout = () => {
//     alert("Logging out...");
//   };

//   const isDark = theme === "dark";

//   return (
//     <div className={`rounded-lg border p-8 space-y-8 transition-colors ${
//       isDark
//         ? "bg-[#0b0f1a] border-gray-600 text-gray-100"
//         : "bg-white border-gray-200 text-gray-900"
//     }`}>
//       <h2 className="text-2xl font-semibold">Settings</h2>

//       {/* Account Section */}
//       <div className="space-y-4">
//         <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
//           Account
//         </h3>
//         <div className="space-y-3">
//           <button
//             onClick={handleProfileEdit}
//             className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
//               isDark
//                 ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
//                 : "border-gray-300 text-gray-900 hover:bg-gray-50"
//             }`}
//           >
//             <span>Edit Profile</span>
//             <span className="text-xl">›</span>
//           </button>
          
//           <button
//             className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
//               isDark
//                 ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
//                 : "border-gray-300 text-gray-900 hover:bg-gray-50"
//             }`}
//           >
//             <span>Change Password</span>
//             <span className="text-xl">›</span>
//           </button>
//         </div>
//       </div>

//       {/* Preferences Section */}
//       <div className="space-y-4">
//         <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
//           Preferences
//         </h3>
        
//         {/* Language Select */}
//         <div className={`flex items-center justify-between p-4 border rounded-lg ${
//           isDark ? "border-gray-700" : "border-gray-300"
//         }`}>
//           <span className="font-medium">Language</span>
//           <select
//             value={language}
//             onChange={(e) => setLanguage(e.target.value)}
//             className={`px-3 py-1 border rounded-md transition-colors ${
//               isDark
//                 ? "bg-[#141b2e] border-gray-700 text-gray-100"
//                 : "bg-white border-gray-300 text-gray-900"
//             }`}
//           >
//             <option value="en">English</option>
//             <option value="es">Español</option>
//             <option value="fr">Français</option>
//             <option value="de">Deutsch</option>
//           </select>
//         </div>

//         {/* Toggle Switches */}
//         <div className={`flex items-center justify-between p-4 border rounded-lg ${
//           isDark ? "border-gray-700" : "border-gray-300"
//         }`}>
//           <div>
//             <div className="font-medium">Push Notifications</div>
//             <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
//               Receive notifications about updates
//             </div>
//           </div>
//           <button
//             onClick={() => setNotifications(!notifications)}
//             className={`relative w-12 h-6 rounded-full transition-colors ${
//               notifications ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
//             }`}
//           >
//             <span
//               className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
//                 notifications ? "translate-x-6" : "translate-x-0"
//               }`}
//             />
//           </button>
//         </div>

//         <div className={`flex items-center justify-between p-4 border rounded-lg ${
//           isDark ? "border-gray-700" : "border-gray-300"
//         }`}>
//           <div>
//             <div className="font-medium">Email Updates</div>
//             <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
//               Get weekly updates via email
//             </div>
//           </div>
//           <button
//             onClick={() => setEmailUpdates(!emailUpdates)}
//             className={`relative w-12 h-6 rounded-full transition-colors ${
//               emailUpdates ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
//             }`}
//           >
//             <span
//               className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
//                 emailUpdates ? "translate-x-6" : "translate-x-0"
//               }`}
//             />
//           </button>
//         </div>

//         <div className={`flex items-center justify-between p-4 border rounded-lg ${
//           isDark ? "border-gray-700" : "border-gray-300"
//         }`}>
//           <div>
//             <div className="font-medium">Auto-Save</div>
//             <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
//               Automatically save your work
//             </div>
//           </div>
//           <button
//             onClick={() => setAutoSave(!autoSave)}
//             className={`relative w-12 h-6 rounded-full transition-colors ${
//               autoSave ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
//             }`}
//           >
//             <span
//               className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
//                 autoSave ? "translate-x-6" : "translate-x-0"
//               }`}
//             />
//           </button>
//         </div>
//       </div>

//       {/* Privacy & Security Section */}
//       <div className="space-y-4">
//         <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
//           Privacy & Security
//         </h3>
//         <div className="space-y-3">
//           <button
//             className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
//               isDark
//                 ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
//                 : "border-gray-300 text-gray-900 hover:bg-gray-50"
//             }`}
//           >
//             <span>Privacy Policy</span>
//             <span className="text-xl">›</span>
//           </button>
          
//           <button
//             className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
//               isDark
//                 ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
//                 : "border-gray-300 text-gray-900 hover:bg-gray-50"
//             }`}
//           >
//             <span>Terms of Service</span>
//             <span className="text-xl">›</span>
//           </button>
//         </div>
//       </div>

//       {/* Danger Zone */}
//       <div className="space-y-4 pt-4 border-t border-gray-700">
//         <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
//           Account Actions
//         </h3>
//         <button
//           onClick={handleLogout}
//           className={`w-full px-4 py-3 border rounded-lg font-medium transition-colors ${
//             isDark
//               ? "border-red-900 bg-red-950 text-red-400 hover:bg-red-900"
//               : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
//           }`}
//         >
//           Log Out
//         </button>
//       </div>
//     </div>
//   );
// }

import React, { useState } from "react";
import Layout from "../components/Layout"; // import Layout

export default function Settings({ theme = "light", toggleTheme }) {
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState("en");

  const handleProfileEdit = () => alert("Profile Edit clicked!");
  const handleLogout = () => alert("Logging out...");

  const isDark = theme === "dark";

  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
      <div className={`rounded-lg border p-8 space-y-8 transition-colors ${
        isDark
          ? "bg-[#0b0f1a] border-gray-600 text-gray-100"
          : "bg-white border-gray-200 text-gray-900"
      }`}>
        <h2 className="text-2xl font-semibold">Settings</h2>

{/* Account Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
          Account
        </h3>
        <div className="space-y-3">
          <button
            onClick={handleProfileEdit}
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
              isDark
                ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
                : "border-gray-300 text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>Edit Profile</span>
            <span className="text-xl">›</span>
          </button>
          
          <button
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
              isDark
                ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
                : "border-gray-300 text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>Change Password</span>
            <span className="text-xl">›</span>
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
          Preferences
        </h3>
        
        {/* Language Select */}
        <div className={`flex items-center justify-between p-4 border rounded-lg ${
          isDark ? "border-gray-700" : "border-gray-300"
        }`}>
          <span className="font-medium">Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`px-3 py-1 border rounded-md transition-colors ${
              isDark
                ? "bg-[#141b2e] border-gray-700 text-gray-100"
                : "bg-white border-gray-300 text-gray-900"
            }`}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        {/* Toggle Switches */}
        <div className={`flex items-center justify-between p-4 border rounded-lg ${
          isDark ? "border-gray-700" : "border-gray-300"
        }`}>
          <div>
            <div className="font-medium">Push Notifications</div>
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Receive notifications about updates
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              notifications ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                notifications ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className={`flex items-center justify-between p-4 border rounded-lg ${
          isDark ? "border-gray-700" : "border-gray-300"
        }`}>
          <div>
            <div className="font-medium">Email Updates</div>
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Get weekly updates via email
            </div>
          </div>
          <button
            onClick={() => setEmailUpdates(!emailUpdates)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              emailUpdates ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                emailUpdates ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className={`flex items-center justify-between p-4 border rounded-lg ${
          isDark ? "border-gray-700" : "border-gray-300"
        }`}>
          <div>
            <div className="font-medium">Auto-Save</div>
            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Automatically save your work
            </div>
          </div>
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              autoSave ? "bg-blue-600" : isDark ? "bg-gray-700" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                autoSave ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
          Privacy & Security
        </h3>
        <div className="space-y-3">
          <button
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
              isDark
                ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
                : "border-gray-300 text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>Privacy Policy</span>
            <span className="text-xl">›</span>
          </button>
          
          <button
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg font-medium transition-colors ${
              isDark
                ? "border-gray-700 text-gray-100 hover:bg-[#141b2e]"
                : "border-gray-300 text-gray-900 hover:bg-gray-50"
            }`}
          >
            <span>Terms of Service</span>
            <span className="text-xl">›</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="space-y-4 pt-4 border-t border-gray-700">
        <h3 className={`text-lg font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
          Account Actions
        </h3>
        <button
          onClick={handleLogout}
          className={`w-full px-4 py-3 border rounded-lg font-medium transition-colors ${
            isDark
              ? "border-red-900 bg-red-950 text-red-400 hover:bg-red-900"
              : "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
          }`}
        >
          Log Out
        </button>
      </div>
      </div>
    </Layout>
  );
}
