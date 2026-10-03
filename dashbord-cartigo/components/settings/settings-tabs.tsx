"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type SettingsTab = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SettingsTabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  tabs: SettingsTab[];
};

export function SettingsTabs({ value, onValueChange, tabs }: SettingsTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
