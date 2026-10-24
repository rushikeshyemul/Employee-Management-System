"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchService } from "@/lib/api/services";
import { useAuth } from "@/features/auth/auth-provider";
import { hasPermission } from "@/lib/permissions";

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { user, permissions } = useAuth();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => searchService.search(debounced),
    enabled: open && debounced.length > 1,
  });

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search Workforce Hub" description="Search tasks, people, and projects">
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search by name, email, or task key" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>{debounced.length < 2 ? "Type at least 2 characters." : "No matches."}</CommandEmpty>
          {results.data?.tasks.length ? (
            <CommandGroup heading="Tasks">
              {results.data.tasks.map((task) => (
                <CommandItem key={task.id} value={task.key} onSelect={() => go(`/tasks/${task.id}`)}>
                  <span className="font-mono text-xs text-muted-foreground">{task.key}</span>
                  {task.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.data?.employees.length ? (
            <CommandGroup heading="People">
              {results.data.employees.map((employee) => (
                <CommandItem key={employee.id} value={employee.email} onSelect={() => go(hasPermission(permissions, "employees.view") ? `/employees/${employee.id}` : employee.id === user?.id ? "/profile" : "/dashboard")}>
                  {employee.first_name} {employee.last_name}
                  <span className="text-xs text-muted-foreground">{employee.job_title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {results.data?.projects.length ? (
            <CommandGroup heading="Projects">
              {results.data.projects.map((project) => (
                <CommandItem key={project.id} value={project.key} onSelect={() => go(`/projects/${project.id}`)}>
                  {project.key} · {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
