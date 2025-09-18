// Types for the documentation site
export interface DocEntry {
  title: string;
  description: string;
  order?: number;
  category?: string;
  draft?: boolean;
}

export interface SocialLink {
  icon: string;
  href: string;
  label: string;
}
