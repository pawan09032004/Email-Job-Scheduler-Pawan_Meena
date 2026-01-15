import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import Papa from "papaparse";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export interface ParsedEmail {
  toEmail: string;
  subject: string;
  body: string;
}

export function parseCSV(file: File): Promise<ParsedEmail[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const emails = results.data as ParsedEmail[];
        // Simple deduplication
        const unique = Array.from(
          new Map(emails.map((email) => [email.toEmail, email])).values()
        );
        resolve(unique);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
