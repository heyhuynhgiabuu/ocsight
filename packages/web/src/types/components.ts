// TypeScript interfaces for component props

export interface BaseComponentProps {
  class?: string;
  children?: any;
}

export interface HeroProps extends BaseComponentProps {
  title?: string;
  description?: string;
  slug?: string;
}

export interface LandingHeroProps extends BaseComponentProps {
  title?: string;
  description?: string;
  cta?: {
    primary: { text: string; href: string };
    secondary?: { text: string; href: string };
  };
}

export interface DefaultHeroProps extends BaseComponentProps {
  title?: string;
  description?: string;
}

export interface CustomHeaderProps extends BaseComponentProps {
  showMobileMenu?: boolean;
}

export interface SiteTitleProps extends BaseComponentProps {
  showLogo?: boolean;
  size?: "sm" | "md" | "lg";
}

export interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface CardProps extends BaseComponentProps {
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  required?: boolean;
  onChange?: (value: string) => void;
}

export interface LabelProps extends BaseComponentProps {
  htmlFor?: string;
  required?: boolean;
}

export interface TabsProps extends BaseComponentProps {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export interface TabProps extends BaseComponentProps {
  value: string;
  disabled?: boolean;
}

export interface SelectProps extends BaseComponentProps {
  options: Array<{ value: string; label: string }>;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}
