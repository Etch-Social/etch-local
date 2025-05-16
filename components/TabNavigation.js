import { useState } from "react";

const TabNavigation = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b mb-6">
      <button
        className={`px-4 py-2 font-medium text-sm ${
          activeTab === "publish"
            ? "border-b-2 border-blue-500 text-blue-600"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => onTabChange("publish")}
      >
        Publish
      </button>
      <button
        className={`px-4 py-2 font-medium text-sm ${
          activeTab === "feeds"
            ? "border-b-2 border-blue-500 text-blue-600"
            : "text-gray-500 hover:text-gray-700"
        }`}
        onClick={() => onTabChange("feeds")}
      >
        Feeds
      </button>
    </div>
  );
};

export default TabNavigation;
