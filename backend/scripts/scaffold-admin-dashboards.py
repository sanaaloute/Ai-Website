#!/usr/bin/env python3
"""Scaffold an admin dashboard + PocketBase backend for every frontend template.

The e-commerce template is used as the reference implementation. This script
replicates its structure (admin routes, PocketBase client, and a sibling
pocketbase-<template> backend) for the remaining placeholder templates.
"""

import json
import os
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = ROOT / "src" / "templates"

ICONS = {
    "Dashboard": "LayoutDashboard",
    "Users": "Users",
    "Settings": "Settings",
    "LogOut": "LogOut",
    "listings": "Car",
    "posts": "FileText",
    "courses": "BookOpen",
    "products": "Shirt",
    "pages": "Layout",
    "services": "Heart",
    "jobs": "Briefcase",
    "entries": "PenTool",
    "projects": "Layers",
    "properties": "Home",
    "menu_items": "Utensils",
    "features": "Zap",
    "tours": "Map",
    "categories": "Tags",
    "plans": "CreditCard",
    "inquiries": "MessageSquare",
    "comments": "MessageCircle",
    "enrollments": "UserPlus",
    "orders": "ShoppingBag",
    "contacts": "Mail",
    "appointments": "Calendar",
    "applications": "Send",
    "messages": "MessageSquare",
    "reservations": "CalendarCheck",
    "subscribers": "Users",
    "bookings": "Ticket",
}


def icon_for(key: str) -> str:
    return ICONS.get(key, "Tag")


CONFIG = {
    "automobile": {
        "label": "Automotive",
        "settings": {"siteName": "LoveCode Automotive", "tagline": "Find your next ride"},
        "primary": {
            "name": "listings",
            "singular": "Listing",
            "plural": "Listings",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "make", "type": "text", "required": False},
                {"name": "model", "type": "text", "required": False},
                {"name": "year", "type": "number", "required": False, "options": {"min": 1900, "max": 2100, "noDecimal": True}},
                {"name": "price", "type": "number", "required": False, "options": {"min": 0}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "inquiries", "singular": "Inquiry", "plural": "Inquiries", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "listing", "type": "relation", "required": False, "related": "listings"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["new", "contacted", "closed"]}},
            {"name": "message", "type": "text", "required": False},
        ]},
    },
    "blog": {
        "label": "Blog",
        "settings": {"siteName": "LoveCode Blog", "tagline": "Stories and ideas"},
        "primary": {
            "name": "posts",
            "singular": "Post",
            "plural": "Posts",
            "fields": [
                {"name": "title", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "excerpt", "type": "text", "required": False},
                {"name": "content", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["published", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "comments", "singular": "Comment", "plural": "Comments", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "post", "type": "relation", "required": True, "related": "posts"},
            {"name": "body", "type": "text", "required": True},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "approved", "rejected"]}},
        ]},
    },
    "education": {
        "label": "Education",
        "settings": {"siteName": "LoveCode Learning", "tagline": "Expand your skills"},
        "primary": {
            "name": "courses",
            "singular": "Course",
            "plural": "Courses",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "instructor", "type": "text", "required": False},
                {"name": "duration", "type": "text", "required": False},
                {"name": "price", "type": "number", "required": False, "options": {"min": 0}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "enrollments", "singular": "Enrollment", "plural": "Enrollments", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "course", "type": "relation", "required": True, "related": "courses"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "approved", "rejected"]}},
        ]},
    },
    "fashion": {
        "label": "Fashion",
        "settings": {"siteName": "LoveCode Fashion", "tagline": "Style made simple"},
        "primary": {
            "name": "products",
            "singular": "Product",
            "plural": "Products",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "price", "type": "number", "required": True, "options": {"min": 0}},
                {"name": "stock", "type": "number", "required": True, "options": {"min": 0, "noDecimal": True}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "orders", "singular": "Order", "plural": "Orders", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "paid", "shipped", "cancelled"]}},
            {"name": "total", "type": "number", "required": True, "options": {"min": 0}},
            {"name": "items", "type": "json", "required": True},
        ]},
    },
    "generic": {
        "label": "Site",
        "settings": {"siteName": "LoveCode Site", "tagline": "Your next great site"},
        "primary": {
            "name": "pages",
            "singular": "Page",
            "plural": "Pages",
            "fields": [
                {"name": "title", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "content", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["published", "draft", "archived"]}},
            ],
        },
        "categories": None,
        "requests": {"name": "contacts", "singular": "Contact", "plural": "Contacts", "fields": [
            {"name": "user", "type": "relation", "required": False, "related": "users"},
            {"name": "name", "type": "text", "required": True},
            {"name": "email", "type": "text", "required": True},
            {"name": "message", "type": "text", "required": True},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["new", "replied", "closed"]}},
        ]},
    },
    "health": {
        "label": "Health",
        "settings": {"siteName": "LoveCode Health", "tagline": "Wellness at your fingertips"},
        "primary": {
            "name": "services",
            "singular": "Service",
            "plural": "Services",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "provider", "type": "text", "required": False},
                {"name": "price", "type": "number", "required": False, "options": {"min": 0}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "appointments", "singular": "Appointment", "plural": "Appointments", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "service", "type": "relation", "required": False, "related": "services"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "confirmed", "cancelled", "completed"]}},
            {"name": "notes", "type": "text", "required": False},
        ]},
    },
    "job_portal": {
        "label": "Jobs",
        "settings": {"siteName": "LoveCode Jobs", "tagline": "Find your dream role"},
        "primary": {
            "name": "jobs",
            "singular": "Job",
            "plural": "Jobs",
            "fields": [
                {"name": "title", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "company", "type": "text", "required": False},
                {"name": "location", "type": "text", "required": False},
                {"name": "salary", "type": "text", "required": False},
                {"name": "description", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "applications", "singular": "Application", "plural": "Applications", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "job", "type": "relation", "required": True, "related": "jobs"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "reviewed", "accepted", "rejected"]}},
            {"name": "coverLetter", "type": "text", "required": False},
        ]},
    },
    "personal": {
        "label": "Personal",
        "settings": {"siteName": "LoveCode Personal", "tagline": "Your personal corner"},
        "primary": {
            "name": "entries",
            "singular": "Entry",
            "plural": "Entries",
            "fields": [
                {"name": "title", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "summary", "type": "text", "required": False},
                {"name": "content", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["published", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "messages", "singular": "Message", "plural": "Messages", "fields": [
            {"name": "user", "type": "relation", "required": False, "related": "users"},
            {"name": "name", "type": "text", "required": True},
            {"name": "email", "type": "text", "required": True},
            {"name": "body", "type": "text", "required": True},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["new", "replied", "closed"]}},
        ]},
    },
    "portfolio": {
        "label": "Portfolio",
        "settings": {"siteName": "LoveCode Portfolio", "tagline": "Selected work"},
        "primary": {
            "name": "projects",
            "singular": "Project",
            "plural": "Projects",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "client", "type": "text", "required": False},
                {"name": "link", "type": "text", "required": False},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "contacts", "singular": "Contact", "plural": "Contacts", "fields": [
            {"name": "user", "type": "relation", "required": False, "related": "users"},
            {"name": "name", "type": "text", "required": True},
            {"name": "email", "type": "text", "required": True},
            {"name": "message", "type": "text", "required": True},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["new", "replied", "closed"]}},
        ]},
    },
    "real_estate": {
        "label": "Real Estate",
        "settings": {"siteName": "LoveCode Real Estate", "tagline": "Find your place"},
        "primary": {
            "name": "properties",
            "singular": "Property",
            "plural": "Properties",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "location", "type": "text", "required": False},
                {"name": "price", "type": "number", "required": False, "options": {"min": 0}},
                {"name": "bedrooms", "type": "number", "required": False, "options": {"min": 0, "noDecimal": True}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "inquiries", "singular": "Inquiry", "plural": "Inquiries", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "property", "type": "relation", "required": False, "related": "properties"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["new", "contacted", "closed"]}},
            {"name": "message", "type": "text", "required": False},
        ]},
    },
    "restaurant": {
        "label": "Restaurant",
        "settings": {"siteName": "LoveCode Restaurant", "tagline": "Reserve your table"},
        "primary": {
            "name": "menu_items",
            "singular": "Menu Item",
            "plural": "Menu Items",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "price", "type": "number", "required": True, "options": {"min": 0}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "reservations", "singular": "Reservation", "plural": "Reservations", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "partySize", "type": "number", "required": True, "options": {"min": 1, "noDecimal": True}},
            {"name": "date", "type": "text", "required": True},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "confirmed", "cancelled", "completed"]}},
            {"name": "notes", "type": "text", "required": False},
        ]},
    },
    "saas": {
        "label": "SaaS",
        "settings": {"siteName": "LoveCode SaaS", "tagline": "Build faster"},
        "primary": {
            "name": "features",
            "singular": "Feature",
            "plural": "Features",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "description", "type": "text", "required": False},
                {"name": "icon", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
            ],
        },
        "categories": {"name": "plans", "singular": "Plan", "plural": "Plans", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
            {"name": "price", "type": "number", "required": False, "options": {"min": 0}},
        ]},
        "requests": {"name": "subscribers", "singular": "Subscriber", "plural": "Subscribers", "fields": [
            {"name": "user", "type": "relation", "required": False, "related": "users"},
            {"name": "email", "type": "text", "required": True},
            {"name": "plan", "type": "relation", "required": False, "related": "plans"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "cancelled", "pending"]}},
        ]},
    },
    "travel": {
        "label": "Travel",
        "settings": {"siteName": "LoveCode Travel", "tagline": "Explore the world"},
        "primary": {
            "name": "tours",
            "singular": "Tour",
            "plural": "Tours",
            "fields": [
                {"name": "name", "type": "text", "required": True, "presentable": True},
                {"name": "slug", "type": "text", "required": True, "presentable": True, "unique": True},
                {"name": "destination", "type": "text", "required": False},
                {"name": "duration", "type": "text", "required": False},
                {"name": "price", "type": "number", "required": False, "options": {"min": 0}},
                {"name": "description", "type": "text", "required": False},
                {"name": "image", "type": "text", "required": False},
                {"name": "status", "type": "select", "required": True, "options": {"values": ["active", "draft", "archived"]}},
                {"name": "category", "type": "relation", "required": False, "related": "categories"},
            ],
        },
        "categories": {"name": "categories", "singular": "Category", "plural": "Categories", "fields": [
            {"name": "name", "type": "text", "required": True, "presentable": True},
            {"name": "slug", "type": "text", "required": True, "unique": True},
        ]},
        "requests": {"name": "bookings", "singular": "Booking", "plural": "Bookings", "fields": [
            {"name": "user", "type": "relation", "required": True, "related": "users"},
            {"name": "tour", "type": "relation", "required": False, "related": "tours"},
            {"name": "status", "type": "select", "required": True, "options": {"values": ["pending", "confirmed", "cancelled", "completed"]}},
            {"name": "notes", "type": "text", "required": False},
        ]},
    },
}


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"  wrote {path.relative_to(ROOT)}")


def pascal(s: str) -> str:
    return "".join(w.capitalize() for w in s.replace("-", "_").split("_"))


def admin_label(s: str) -> str:
    return s.replace("_", " ").title()


def is_textarea(name: str) -> bool:
    return name in {"description", "content", "excerpt", "summary", "body", "message", "coverLetter", "notes"}


# ---------------------------------------------------------------------------
# Shared admin components
# ---------------------------------------------------------------------------
UI_TSX = '''import { cn } from '@/lib/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={cn(
          'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        className={cn(
          'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={cn(
          'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminCard({ children, className }: AdminCardProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      {action}
    </div>
  );
}
'''

ADMIN_ROUTE_GUARD_TSX = '''import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { currentUser, isAuthenticated } from '@/lib/pocketbase';

export function AdminRouteGuard() {
  const location = useLocation();
  const user = currentUser();

  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-lg font-semibold text-red-900">Access denied</h1>
          <p className="mt-2 text-sm text-red-700">
            You do not have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
'''


def gen_admin_layout(config: dict) -> str:
    label = config["label"]
    primary = config["primary"]
    categories = config.get("categories")
    requests = config.get("requests")

    nav_items = [{"label": "Dashboard", "to": "/admin", "icon": "LayoutDashboard", "end": True}]
    nav_items.append({
        "label": admin_label(primary["plural"]),
        "to": f'/admin/{primary["name"]}',
        "icon": icon_for(primary["name"]),
    })
    if categories:
        nav_items.append({
            "label": admin_label(categories["plural"]) if "plural" in categories else admin_label(categories["name"]),
            "to": f'/admin/{categories["name"]}',
            "icon": icon_for(categories["name"]),
        })
    if requests:
        nav_items.append({
            "label": admin_label(requests["plural"]),
            "to": f'/admin/{requests["name"]}',
            "icon": icon_for(requests["name"]),
        })
    nav_items.append({"label": "Users", "to": "/admin/users", "icon": "Users"})
    nav_items.append({"label": "Settings", "to": "/admin/settings", "icon": "Settings"})

    icon_imports = ", ".join(sorted({item["icon"] for item in nav_items} | {"LogOut"}))

    nav_code = "\n".join(
        f"  {{ label: '{item['label']}', to: '{item['to']}', icon: {item['icon']}{', end: true' if item.get('end') else ''} }},"
        for item in nav_items
    )

    return f'''import {{ NavLink, Outlet, useNavigate }} from 'react-router-dom';
import {{ {icon_imports} }} from 'lucide-react';
import {{ logout }} from '@/lib/pocketbase';

const nav = [
{nav_code}
];

export function AdminLayout() {{
  const navigate = useNavigate();

  const handleLogout = () => {{
    logout();
    navigate('/admin/login');
  }};

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="relative w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-semibold text-gray-900">{label} Admin</span>
        </div>
        <nav className="space-y-1 p-4">
          {{nav.map((item) => (
            <NavLink
              key={{item.to}}
              to={{item.to}}
              end={{item.end}}
              className={{({{ isActive }}) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${{
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }}`
              }}
            >
              <item.icon className="h-4 w-4" />
              {{item.label}}
            </NavLink>
          ))}}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-200 p-4">
          <button
            onClick={{handleLogout}}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}}
'''


def gen_login(config: dict) -> str:
    label = config["label"]
    return f'''import {{ useState }} from 'react';
import {{ useNavigate, useLocation }} from 'react-router-dom';
import {{ login }} from '@/lib/pocketbase';
import {{ Button }} from '@/components/ui/Button';
import {{ Input }} from '@/admin/components/ui';

export default function AdminLogin() {{
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = (location.state as {{ from?: {{ pathname?: string }} }})?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {{
    e.preventDefault();
    setError('');
    setLoading(true);
    try {{
      const auth = await login(email, password);
      if (auth.record.role !== 'admin') {{
        setError('This account does not have admin access.');
        return;
      }}
      navigate(from, {{ replace: true }});
    }} catch (err) {{
      setError(err instanceof Error ? err.message : 'Login failed');
    }} finally {{
      setLoading(false);
    }}
  }};

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{label} Admin</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to manage your {label.lower()} site.</p>
        <form onSubmit={{handleSubmit}} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={{email}}
            onChange={{(e) => setEmail(e.target.value)}}
          />
          <Input
            label="Password"
            type="password"
            required
            value={{password}}
            onChange={{(e) => setPassword(e.target.value)}}
          />
          {{error && <p className="text-sm text-red-600">{{error}}</p>}}
          <Button type="submit" loading={{loading}} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}}
'''


def gen_users() -> str:
    return '''import { useEffect, useState } from 'react';
import { listAllUsers, updateUserRole, type User } from '@/lib/pocketbase';
import { Badge } from '@/components/ui/Badge';
import { Select, PageHeader } from '@/admin/components/ui';

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const u = await listAllUsers(1, 100);
      setUsers(u.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (id: string, role: User['role']) => {
    try {
      await updateUserRole(id, role);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  if (loading) return <div className="text-gray-600">Loading users...</div>;

  return (
    <div>
      <PageHeader title="Users" />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-700">Email</th>
              <th className="px-6 py-3 font-medium text-gray-700">Name</th>
              <th className="px-6 py-3 font-medium text-gray-700">Role</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 font-medium text-gray-900">{u.email}</td>
                <td className="px-6 py-4 text-gray-600">{u.name || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === 'admin' ? 'accent' : 'default'}>{u.role || 'customer'}</Badge>
                    <Select
                      options={ROLE_OPTIONS}
                      value={u.role || 'customer'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as User['role'])}
                      className="w-32"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-gray-600">
                  {new Date(u.created).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
'''


def gen_settings(config: dict) -> str:
    settings = config["settings"]
    pairs = [f"  {k}: '{v}'," for k, v in settings.items()]
    defaults = "\n".join(pairs)
    storage_key = f'lovecode_{config["primary"]["name"]}_settings'
    return f'''import {{ useEffect, useState }} from 'react';
import {{ Button }} from '@/components/ui/Button';
import {{ Input, Textarea, PageHeader, AdminCard }} from '@/admin/components/ui';

interface SiteSettings {{
{chr(10).join(f"  {k}: string;" for k in settings)}
}}

const DEFAULT_SETTINGS: SiteSettings = {{
{defaults}
}};

const STORAGE_KEY = '{storage_key}';

function loadSettings(): SiteSettings {{
  try {{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? {{ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }} : DEFAULT_SETTINGS;
  }} catch {{
    return DEFAULT_SETTINGS;
  }}
}}

function saveSettings(settings: SiteSettings) {{
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}}

export default function AdminSettings() {{
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {{
    setSettings(loadSettings());
  }}, []);

  const handleSubmit = (e: React.FormEvent) => {{
    e.preventDefault();
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }};

  return (
    <div>
      <PageHeader title="Settings" />

      <AdminCard className="max-w-2xl">
        <form onSubmit={{handleSubmit}} className="space-y-4">
          <Input
            label="Site name"
            value={{settings.siteName}}
            onChange={{(e) => setSettings({{ ...settings, siteName: e.target.value }})}}
          />
          <Input
            label="Tagline"
            value={{settings.tagline}}
            onChange={{(e) => setSettings({{ ...settings, tagline: e.target.value }})}}
          />
          <Textarea
            label="Footer text"
            rows={{3}}
            value={{settings.footerText || ''}}
            onChange={{(e) => setSettings({{ ...settings, footerText: e.target.value }})}}
          />
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">Save settings</Button>
            {{saved && <span className="text-sm text-green-600">Saved!</span>}}
          </div>
          <p className="text-xs text-gray-500">
            These settings are stored in the browser for this demo. In production they should be
            persisted in a PocketBase <code>settings</code> collection.
          </p>
        </form>
      </AdminCard>
    </div>
  );
}}
'''


# Note: settings may not have footerText; need include in interface and default. Adjust settings default.
# We'll ensure each settings has footerText: ''. Add to config? Could add in code.
# Actually we can make settings dynamic with generic fields: siteName, tagline, footerText. Use config settings only for defaults of siteName/tagline. Simpler: fixed fields.

def gen_settings_fixed(config: dict) -> str:
    label = config["label"]
    site_name = config["settings"].get("siteName", f"LoveCode {label}")
    tagline = config["settings"].get("tagline", "")
    return f'''import {{ useEffect, useState }} from 'react';
import {{ Button }} from '@/components/ui/Button';
import {{ Input, Textarea, PageHeader, AdminCard }} from '@/admin/components/ui';

interface SiteSettings {{
  siteName: string;
  tagline: string;
  footerText: string;
}}

const DEFAULT_SETTINGS: SiteSettings = {{
  siteName: '{site_name}',
  tagline: '{tagline}',
  footerText: '',
}};

const STORAGE_KEY = 'lovecode_{config["primary"]["name"]}_settings';

function loadSettings(): SiteSettings {{
  try {{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? {{ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }} : DEFAULT_SETTINGS;
  }} catch {{
    return DEFAULT_SETTINGS;
  }}
}}

function saveSettings(settings: SiteSettings) {{
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}}

export default function AdminSettings() {{
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {{
    setSettings(loadSettings());
  }}, []);

  const handleSubmit = (e: React.FormEvent) => {{
    e.preventDefault();
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }};

  return (
    <div>
      <PageHeader title="Settings" />

      <AdminCard className="max-w-2xl">
        <form onSubmit={{handleSubmit}} className="space-y-4">
          <Input
            label="Site name"
            value={{settings.siteName}}
            onChange={{(e) => setSettings({{ ...settings, siteName: e.target.value }})}}
          />
          <Input
            label="Tagline"
            value={{settings.tagline}}
            onChange={{(e) => setSettings({{ ...settings, tagline: e.target.value }})}}
          />
          <Textarea
            label="Footer text"
            rows={{3}}
            value={{settings.footerText}}
            onChange={{(e) => setSettings({{ ...settings, footerText: e.target.value }})}}
          />
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit">Save settings</Button>
            {{saved && <span className="text-sm text-green-600">Saved!</span>}}
          </div>
          <p className="text-xs text-gray-500">
            These settings are stored in the browser for this demo. In production they should be
            persisted in a PocketBase <code>settings</code> collection.
          </p>
        </form>
      </AdminCard>
    </div>
  );
}}
'''


# Continue with pocketbase.ts and pages in script... Need finish script.



def field_type_ts(field: dict) -> str:
    t = field["type"]
    if t == "text":
        return "string"
    if t == "number":
        return "number"
    if t == "select":
        return "string"
    if t == "relation":
        return "string"
    if t == "json":
        return "unknown"
    return "string"


def gen_pocketbase_ts(config: dict) -> str:
    primary = config["primary"]
    categories = config.get("categories")
    requests = config.get("requests")
    primary_name = primary["name"]
    PrimaryType = pascal(primary_name)

    # Type definitions
    type_defs = []
    type_defs.append("export interface User extends RecordModel {\n  email: string;\n  name?: string;\n  role?: 'customer' | 'admin';\n  phone?: string;\n  address?: string;\n}")
    if categories:
        cat_type = pascal(categories["name"])
        type_defs.append(f"export interface {cat_type} extends RecordModel {{\n  name: string;\n  slug: string;\n}}")
    else:
        cat_type = None

    primary_fields = "\n".join(f"  {f['name']}?: {field_type_ts(f)};" for f in primary["fields"])
    expand = f"  expand?: {{ category?: {cat_type} }};" if categories and any(f.get("related") == categories["name"] for f in primary["fields"]) else ""
    type_defs.append(f"export interface {PrimaryType} extends RecordModel {{\n{primary_fields}\n{expand}\n}}")

    if requests:
        req_type = pascal(requests["name"])
        req_fields = "\n".join(f"  {f['name']}?: {field_type_ts(f)};" for f in requests["fields"])
        expand_refs = []
        for f in requests["fields"]:
            if f.get("related") == "users":
                expand_refs.append("user?: User")
            elif f.get("related") == primary_name:
                expand_refs.append(f"{f['name']}?: {PrimaryType}")
        expand_req = f"  expand?: {{ {', '.join(expand_refs)} }};" if expand_refs else ""
        type_defs.append(f"export interface {req_type} extends RecordModel {{\n{req_fields}\n{expand_req}\n}}")
    else:
        req_type = None

    # Public helpers
    public_helpers = []
    status_values = []
    for f in primary["fields"]:
        if f["type"] == "select":
            status_values = f["options"]["values"]
            break
    published_status = "active" if "active" in status_values else (status_values[0] if status_values else "active")
    public_helpers.append(f"""export async function listPublished{PrimaryType}(page = 1, perPage = 20) {{
  return pb.collection('{primary_name}').getList<{PrimaryType}>(page, perPage, {{
    filter: 'status = "{published_status}"',
    sort: '-created',
  }});
}}""")

    # Admin helpers
    admin_helpers = [f"""export async function listAll{PrimaryType}(page = 1, perPage = 50) {{
  return pb.collection('{primary_name}').getList<{PrimaryType}>(page, perPage, {{
    expand: '{','.join(f['name'] for f in primary['fields'] if f.get('related'))}',
    sort: '-created',
  }});
}}

export async function create{PrimaryType}(data: Partial<{PrimaryType}>) {{
  return pb.collection('{primary_name}').create<{PrimaryType}>(data);
}}

export async function update{PrimaryType}(id: string, data: Partial<{PrimaryType}>) {{
  return pb.collection('{primary_name}').update<{PrimaryType}>(id, data);
}}

export async function delete{PrimaryType}(id: string) {{
  return pb.collection('{primary_name}').delete(id);
}}"""]

    if categories:
        cat_type = pascal(categories["name"])
        cat_name = categories["name"]
        admin_helpers.append(f"""export async function listAll{cat_type}() {{
  return pb.collection('{cat_name}').getFullList<{cat_type}>({{ sort: 'name' }});
}}

export async function create{cat_type}(data: Partial<{cat_type}>) {{
  return pb.collection('{cat_name}').create<{cat_type}>(data);
}}

export async function update{cat_type}(id: string, data: Partial<{cat_type}>) {{
  return pb.collection('{cat_name}').update<{cat_type}>(id, data);
}}

export async function delete{cat_type}(id: string) {{
  return pb.collection('{cat_name}').delete(id);
}}""")

    if requests:
        req_type = pascal(requests["name"])
        req_name = requests["name"]
        expand_names = ",".join(f['name'] for f in requests["fields"] if f.get("related"))
        admin_helpers.append(f"""export async function listAll{req_type}(page = 1, perPage = 50) {{
  return pb.collection('{req_name}').getList<{req_type}>(page, perPage, {{
    expand: '{expand_names}',
    sort: '-created',
  }});
}}

export async function update{req_type}Status(id: string, status: {req_type}['status']) {{
  return pb.collection('{req_name}').update<{req_type}>(id, {{ status }});
}}

export async function delete{req_type}(id: string) {{
  return pb.collection('{req_name}').delete(id);
}}""")

    admin_helpers.append("""export async function listAllUsers(page = 1, perPage = 50) {
  return pb.collection('users').getList<User>(page, perPage, { sort: '-created' });
}

export async function updateUserRole(id: string, role: User['role']) {
  return pb.collection('users').update<User>(id, { role });
}""")

    types_block = "\n\n".join(type_defs)
    helpers_block = "\n\n".join(["\n\n".join(public_helpers), "\n\n".join(admin_helpers)])

    return f"""import PocketBase, {{ type RecordModel }} from 'pocketbase';

const url = import.meta.env.VITE_POCKETBASE_URL || '/api';

export const pb = new PocketBase(url);

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
{types_block}

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
export async function register(email: string, password: string, name: string) {{
  return pb.collection('users').create({{
    email,
    password,
    passwordConfirm: password,
    name,
  }});
}}

export async function login(email: string, password: string) {{
  return pb.collection('users').authWithPassword<User>(email, password);
}}

export function logout() {{
  pb.authStore.clear();
}}

export function isAuthenticated() {{
  return pb.authStore.isValid;
}}

export function currentUser() {{
  return pb.authStore.model as User | null;
}}

export function isAdmin() {{
  return currentUser()?.role === 'admin';
}}

// ------------------------------------------------------------------
// Public
// ------------------------------------------------------------------
{helpers_block}
"""


def gen_dashboard(config: dict) -> str:
    primary = config["primary"]
    categories = config.get("categories")
    requests = config.get("requests")
    PrimaryType = pascal(primary["name"])
    ReqType = pascal(requests["name"]) if requests else None

    icon_primary = icon_for(primary["name"])
    imports = ["Users", icon_primary]
    if requests:
        imports.append(icon_for(requests["name"]))
    if categories:
        imports.append("Tags")

    state_keys = [f"{primary['name']}: 0"]
    state_types = [f"{primary['name']}: number"]
    load_calls = [f"listAll{PrimaryType}(1, 1)"]
    if categories:
        state_keys.append(f"{categories['name']}: 0")
        state_types.append(f"{categories['name']}: number")
        load_calls.append(f"listAll{pascal(categories['name'])}()")
    if requests:
        state_keys.append(f"{requests['name']}: 0")
        state_types.append(f"{requests['name']}: number")
        state_keys.append(f"recentRequests: [] as {ReqType}[]")
        state_types.append(f"recentRequests: {ReqType}[]")
    state_keys.append("users: 0")
    state_types.append("users: number")
    state_keys.append("loading: true")
    state_types.append("loading: boolean")

    stat_cards = [
        f"{{ label: '{admin_label(primary['plural'])}', value: stats.{primary['name']}, icon: {icon_primary} }}",
    ]
    if requests:
        stat_cards.append(f"{{ label: '{admin_label(requests['plural'])}', value: stats.{requests['name']}, icon: {icon_for(requests['name'])} }}")
    if categories:
        label = admin_label(categories["name"])
        stat_cards.append(f"{{ label: '{label}', value: stats.{categories['name']}, icon: Tags }}")
    stat_cards.append("{ label: 'Users', value: stats.users, icon: Users }")

    load_lines = [f"const {primary['name']} = await listAll{PrimaryType}(1, 1);"]
    if categories:
        load_lines.append(f"const {categories['name']} = await listAll{pascal(categories['name'])}();")
    if requests:
        load_lines.append(f"const {requests['name']} = await listAll{ReqType}(1, 5);")
    load_lines.append("const users = await listAllUsers(1, 1);")
    load_block = "\n    ".join(load_lines)

    set_state_assignments = [f"{primary['name']}: {primary['name']}.totalItems,"]
    if categories:
        set_state_assignments.append(f"{categories['name']}: {categories['name']}.length,")
    if requests:
        set_state_assignments.append(f"{requests['name']}: {requests['name']}.totalItems,")
        set_state_assignments.append(f"recentRequests: {requests['name']}.items,")
    set_state_assignments.append("users: users.totalItems,")
    set_state_assignments.append("loading: false,")

    recent_table = ""
    if requests:
        recent_table = f"""<AdminCard className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Recent {admin_label(requests['plural'])}</h2>
          {{stats.recentRequests.length === 0 ? (
            <p className="mt-2 text-sm text-gray-600">No {requests['plural']} yet.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">User</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {{stats.recentRequests.map((r) => (
                  <tr key={{r.id}} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 font-medium text-gray-900">#{{r.id.slice(-6)}}</td>
                    <td className="py-3 text-gray-600">{{r.expand?.user?.email || r.user}}</td>
                    <td className="py-3"><Badge>{{r.status}}</Badge></td>
                  </tr>
                ))}}
              </tbody>
            </table>
          )}}
        </AdminCard>"""

    return f"""import {{ useEffect, useState }} from 'react';
import {{ {', '.join(sorted(set(imports)))} }} from 'lucide-react';
import {{
  listAll{PrimaryType},{f" listAll{pascal(categories['name'])}," if categories else ""}{f" listAll{ReqType}," if requests else ""}
  listAllUsers,{f" type {ReqType}," if requests else ""}
}} from '@/lib/pocketbase';
import {{ AdminCard, PageHeader }} from '@/admin/components/ui';
import {{ Badge }} from '@/components/ui/Badge';

export default function AdminDashboard() {{
  const [stats, setStats] = useState({{
    {',\n    '.join(state_keys)}
  }});

  useEffect(() => {{
    async function load() {{
      try {{
        {load_block}

        setStats({{
          {''.join(chr(10) + '          ' + a for a in set_state_assignments)}
        }});
      }} catch (err) {{
        console.error(err);
        setStats((s) => ({{ ...s, loading: false }}));
      }}
    }}
    load();
  }}, []);

  const statCards = [
    {',\n    '.join(stat_cards)}
  ];

  if (stats.loading) return <div className="text-gray-600">Loading dashboard...</div>;

  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {{statCards.map((card) => (
          <AdminCard key={{card.label}}>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2">
                <card.icon className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-600">{{card.label}}</p>
                <p className="text-2xl font-semibold text-gray-900">{{card.value}}</p>
              </div>
            </div>
          </AdminCard>
        ))}}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {recent_table}
      </div>
    </div>
  );
}}
"""


def gen_items_page(config: dict) -> str:
    primary = config["primary"]
    categories = config.get("categories")
    PrimaryType = pascal(primary["name"])
    primary_name = primary["name"]

    status_field = next((f for f in primary["fields"] if f["type"] == "select"), None)
    status_options = status_field["options"]["values"] if status_field else ["active", "draft", "archived"]
    relation_field = next((f for f in primary["fields"] if f.get("related") and categories and f.get("related") == categories["name"]), None)

    imports = ["Plus", "Pencil", "Trash2"]
    pb_imports = [f"listAll{PrimaryType}", f"create{PrimaryType}", f"update{PrimaryType}", f"delete{PrimaryType}", f"type {PrimaryType}"]
    if relation_field:
        pb_imports.append(f"type {pascal(categories['name'])}")
        pb_imports.append(f"listAll{pascal(categories['name'])}")

    status_options_str = ",\n  ".join(f"{{ value: '{v}', label: '{v}' }}" for v in status_options)

    # Empty defaults
    defaults = []
    for f in primary["fields"]:
        t = f["type"]
        if t == "text":
            defaults.append(f'    {f["name"]}: \'\',')
        elif t == "number":
            defaults.append(f'    {f["name"]}: 0,')
        elif t == "select":
            defaults.append(f'    {f["name"]}: \'{status_options[0]}\',')
        elif t == "relation":
            defaults.append(f'    {f["name"]}: \'\',')
        elif t == "json":
            defaults.append(f'    {f["name"]}: [],')
    empty_obj = "\n".join(defaults)

    # Table columns
    display_name_field = next((f["name"] for f in primary["fields"] if f.get("presentable") or f["name"] in {"name", "title"}), "id")
    table_columns = [f"<th className=\"px-6 py-3 font-medium text-gray-700\">{admin_label(display_name_field)}</th>"]
    table_cells = [f'<td className="px-6 py-4 font-medium text-gray-900">{{p.{display_name_field}}}</td>']
    if relation_field:
        table_columns.append(f'<th className="px-6 py-3 font-medium text-gray-700">{admin_label(categories.get("singular", categories["name"]))}</th>')
        table_cells.append(f'<td className="px-6 py-4 text-gray-600">{{p.expand?.{relation_field["name"]}?.name || \'-\'}}</td>')
    # add status column
    if status_field:
        table_columns.append('<th className="px-6 py-3 font-medium text-gray-700">Status</th>')
        table_cells.append('<td className="px-6 py-4"><Badge>{p.status}</Badge></td>')
    # add numeric fields
    for f in primary["fields"]:
        if f["type"] == "number" and f["name"] != "stock":
            table_columns.append(f'<th className="px-6 py-3 font-medium text-gray-700">{admin_label(f["name"])}</th>')
            table_cells.append(f'<td className="px-6 py-4 text-gray-900">{{p.{f["name"]}}}</td>')
    table_columns.append('<th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>')
    table_cells.append('''<td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openEdit(p)}
                    className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="inline-flex rounded-md p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>''')

    # Form inputs
    form_inputs = []
    for f in primary["fields"]:
        name = f["name"]
        label = admin_label(name)
        if f["type"] == "select":
            form_inputs.append(f"""          <Select
            label="{label}"
            options={{STATUS_OPTIONS}}
            value={{form.{name} as string}}
            onChange={{(e) => setForm({{ ...form, {name}: e.target.value }})}}
          />""")
        elif f["type"] == "relation" and relation_field and name == relation_field["name"]:
            form_inputs.append(f"""          <Select
            label="{label}"
            options={{categoryOptions}}
            value={{form.{name} as string}}
            onChange={{(e) => setForm({{ ...form, {name}: e.target.value }})}}
          />""")
        elif f["type"] == "number":
            opts = f.get("options", {})
            step = "1" if opts.get("noDecimal") else "0.01"
            form_inputs.append(f"""          <Input
            label="{label}"
            type="number"
            step="{step}"
            min="{opts.get('min', 0) if opts.get('min') is not None else 0}"
            value={{String(form.{name} ?? 0)}}
            onChange={{(e) => setForm({{ ...form, {name}: Number(e.target.value) }})}}
          />""")
        elif f["type"] == "text" and is_textarea(name):
            form_inputs.append(f"""          <Textarea
            label="{label}"
            rows={{4}}
            value={{form.{name} as string}}
            onChange={{(e) => setForm({{ ...form, {name}: e.target.value }})}}
          />""")
        elif f["type"] == "text":
            required = "required" if f.get("required") else ""
            form_inputs.append(f"""          <Input
            label="{label}"
            {required}
            value={{form.{name} as string}}
            onChange={{(e) => setForm({{ ...form, {name}: e.target.value }})}}
          />""")
        elif f["type"] == "json":
            form_inputs.append(f"""          <Textarea
            label="{label}"
            rows={{4}}
            value={{JSON.stringify(form.{name} || [])}}
            onChange={{(e) => {{
              try {{
                setForm({{ ...form, {name}: JSON.parse(e.target.value) }});
              }} catch {{ /* ignore invalid JSON while typing */ }}
            }}}}
          />""")

    # Group inputs visually if many
    form_body = "\n".join(form_inputs)

    category_state = ""
    category_load = ""
    if relation_field:
        category_state = f"""  const [categories, setCategories] = useState<{pascal(categories['name'])}[]>([]);
  const categoryOptions = [{{ value: '', label: 'None' }}, ...categories.map((c) => ({{ value: c.id, label: c.name }}))];
"""
        category_load = f"""      const c = await listAll{pascal(categories['name'])}();
      setCategories(c);
"""

    return f"""import {{ useEffect, useState }} from 'react';
import {{ {', '.join(imports)} }} from 'lucide-react';
import {{
  {',\n  '.join(pb_imports)},
}} from '@/lib/pocketbase';
import {{ Button }} from '@/components/ui/Button';
import {{ Badge }} from '@/components/ui/Badge';
import {{ Input, Textarea, Select, Modal, PageHeader }} from '@/admin/components/ui';

const STATUS_OPTIONS = [
  {status_options_str}
];

const empty{PrimaryType}: Partial<{PrimaryType}> = {{
{empty_obj}
}};

export default function Admin{PrimaryType}() {{
  const [items, setItems] = useState<{PrimaryType}[]>([]);
{category_state}  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{PrimaryType} | null>(null);
  const [form, setForm] = useState<Partial<{PrimaryType}>>(empty{PrimaryType});
  const [saving, setSaving] = useState(false);

  const load = async () => {{
    setLoading(true);
    try {{
      const p = await listAll{PrimaryType}(1, 100);
      setItems(p.items);
{category_load}    }} catch (err) {{
      console.error(err);
    }} finally {{
      setLoading(false);
    }}
  }};

  useEffect(() => {{
    load();
  }}, []);

  const openCreate = () => {{
    setEditing(null);
    setForm(empty{PrimaryType});
    setModalOpen(true);
  }};

  const openEdit = (item: {PrimaryType}) => {{
    setEditing(item);
    setForm({{ ...item }});
    setModalOpen(true);
  }};

  const handleSave = async (e: React.FormEvent) => {{
    e.preventDefault();
    setSaving(true);
    try {{
      const data = {{ ...form }};
      if (editing) {{
        await update{PrimaryType}(editing.id, data);
      }} else {{
        await create{PrimaryType}(data);
      }}
      setModalOpen(false);
      await load();
    }} catch (err) {{
      alert(err instanceof Error ? err.message : 'Failed to save');
    }} finally {{
      setSaving(false);
    }}
  }};

  const handleDelete = async (id: string) => {{
    if (!confirm('Are you sure you want to delete this {primary['singular'].lower()}?')) return;
    try {{
      await delete{PrimaryType}(id);
      await load();
    }} catch (err) {{
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }}
  }};

  if (loading) return <div className="text-gray-600">Loading {primary_name.replace('_', ' ')}...</div>;

  return (
    <div>
      <PageHeader
        title="{admin_label(primary['plural'])}"
        action={{
          <Button onClick={{openCreate}}>
            <Plus className="mr-2 h-4 w-4" />
            Add {primary['singular'].lower()}
          </Button>
        }}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              {'\n              '.join(table_columns)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {{items.map((p) => (
              <tr key={{p.id}}>
                {'\n                '.join(table_cells)}
              </tr>
            ))}}
          </tbody>
        </table>
      </div>

      <Modal open={{modalOpen}} onClose={{() => setModalOpen(false)}} title={{editing ? 'Edit {primary['singular'].lower()}' : 'Add {primary['singular'].lower()}'}}>
        <form onSubmit={{handleSave}} className="space-y-4">
{form_body}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={{() => setModalOpen(false)}}>
              Cancel
            </Button>
            <Button type="submit" loading={{saving}}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}}
"""


def gen_categories_page(config: dict) -> str:
    categories = config["categories"]
    if not categories:
        return ""
    CatType = pascal(categories["name"])
    cat_name = categories["name"]
    page_title = admin_label(categories.get("plural", cat_name + "s"))
    add_label = categories.get("singular", cat_name[:-1] if cat_name.endswith("s") else cat_name).lower()

    return f"""import {{ useEffect, useState }} from 'react';
import {{ Plus, Pencil, Trash2 }} from 'lucide-react';
import {{
  listAll{CatType},
  create{CatType},
  update{CatType},
  delete{CatType},
  type {CatType},
}} from '@/lib/pocketbase';
import {{ Button }} from '@/components/ui/Button';
import {{ Input, Modal, PageHeader }} from '@/admin/components/ui';

const empty{CatType}: Partial<{CatType}> = {{
  name: '',
  slug: '',
}};

export default function Admin{CatType}() {{
  const [items, setItems] = useState<{CatType}[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{CatType} | null>(null);
  const [form, setForm] = useState<Partial<{CatType}>>(empty{CatType});
  const [saving, setSaving] = useState(false);

  const load = async () => {{
    setLoading(true);
    try {{
      const c = await listAll{CatType}();
      setItems(c);
    }} catch (err) {{
      console.error(err);
    }} finally {{
      setLoading(false);
    }}
  }};

  useEffect(() => {{
    load();
  }}, []);

  const openCreate = () => {{
    setEditing(null);
    setForm(empty{CatType});
    setModalOpen(true);
  }};

  const openEdit = (item: {CatType}) => {{
    setEditing(item);
    setForm({{ ...item }});
    setModalOpen(true);
  }};

  const handleSave = async (e: React.FormEvent) => {{
    e.preventDefault();
    setSaving(true);
    try {{
      if (editing) {{
        await update{CatType}(editing.id, form);
      }} else {{
        await create{CatType}(form);
      }}
      setModalOpen(false);
      await load();
    }} catch (err) {{
      alert(err instanceof Error ? err.message : 'Failed to save');
    }} finally {{
      setSaving(false);
    }}
  }};

  const handleDelete = async (id: string) => {{
    if (!confirm('Are you sure?')) return;
    try {{
      await delete{CatType}(id);
      await load();
    }} catch (err) {{
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }}
  }};

  if (loading) return <div className="text-gray-600">Loading {cat_name.replace('_', ' ')}...</div>;

  return (
    <div>
      <PageHeader
        title="{page_title}"
        action={{
          <Button onClick={{openCreate}}>
            <Plus className="mr-2 h-4 w-4" />
            Add {add_label}
          </Button>
        }}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-700">Name</th>
              <th className="px-6 py-3 font-medium text-gray-700">Slug</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {{items.map((c) => (
              <tr key={{c.id}}>
                <td className="px-6 py-4 font-medium text-gray-900">{{c.name}}</td>
                <td className="px-6 py-4 text-gray-600">{{c.slug}}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={{() => openEdit(c)}}
                    className="mr-2 inline-flex rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={{() => handleDelete(c.id)}}
                    className="inline-flex rounded-md p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}}
          </tbody>
        </table>
      </div>

      <Modal open={{modalOpen}} onClose={{() => setModalOpen(false)}} title={{editing ? 'Edit {add_label}' : 'Add {add_label}'}}>
        <form onSubmit={{handleSave}} className="space-y-4">
          <Input
            label="Name"
            required
            value={{form.name}}
            onChange={{(e) => setForm({{ ...form, name: e.target.value }})}}
          />
          <Input
            label="Slug"
            required
            value={{form.slug}}
            onChange={{(e) => setForm({{ ...form, slug: e.target.value }})}}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={{() => setModalOpen(false)}}>
              Cancel
            </Button>
            <Button type="submit" loading={{saving}}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}}
"""


def gen_requests_page(config: dict) -> str:
    requests = config.get("requests")
    if not requests:
        return ""
    ReqType = pascal(requests["name"])
    req_name = requests["name"]
    page_title = admin_label(requests["plural"])
    status_field = next((f for f in requests["fields"] if f["type"] == "select"), None)
    status_options = status_field["options"]["values"] if status_field else []
    primary_name = config["primary"]["name"]
    primary_relation_field = next((f for f in requests["fields"] if f.get("related") == primary_name), None)

    status_options_str = ",\n  ".join(f"{{ value: '{v}', label: '{v}' }}" for v in status_options)

    return f"""import {{ useEffect, useState }} from 'react';
import {{ Trash2 }} from 'lucide-react';
import {{
  listAll{ReqType},
  update{ReqType}Status,
  delete{ReqType},
  type {ReqType},
}} from '@/lib/pocketbase';
import {{ Button }} from '@/components/ui/Button';
import {{ Select, PageHeader }} from '@/admin/components/ui';

const STATUS_OPTIONS = [
  {status_options_str}
];

export default function Admin{ReqType}() {{
  const [items, setItems] = useState<{ReqType}[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {{
    setLoading(true);
    try {{
      const r = await listAll{ReqType}(1, 100);
      setItems(r.items);
    }} catch (err) {{
      console.error(err);
    }} finally {{
      setLoading(false);
    }}
  }};

  useEffect(() => {{
    load();
  }}, []);

  const handleStatusChange = async (id: string, status: {ReqType}['status']) => {{
    try {{
      await update{ReqType}Status(id, status);
      await load();
    }} catch (err) {{
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }}
  }};

  const handleDelete = async (id: string) => {{
    if (!confirm('Are you sure you want to delete this {req_name.replace('_', ' ')}?')) return;
    try {{
      await delete{ReqType}(id);
      await load();
    }} catch (err) {{
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }}
  }};

  if (loading) return <div className="text-gray-600">Loading {req_name.replace('_', ' ')}...</div>;

  return (
    <div>
      <PageHeader title="{page_title}" />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-700">ID</th>
              <th className="px-6 py-3 font-medium text-gray-700">User</th>
              {f'<th className="px-6 py-3 font-medium text-gray-700">{admin_label(primary_relation_field["name"])}</th>' if primary_relation_field else ''}
              <th className="px-6 py-3 font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {{items.map((r) => (
              <tr key={{r.id}}>
                <td className="px-6 py-4 font-medium text-gray-900">#{{r.id.slice(-6)}}</td>
                <td className="px-6 py-4 text-gray-600">{{r.expand?.user?.email || r.user}}</td>
                {f'<td className="px-6 py-4 text-gray-600">{{r.expand?.{primary_relation_field["name"]}?.name || r.{primary_relation_field["name"]} || \'-\'}}</td>' if primary_relation_field else ''}
                <td className="px-6 py-4">
                  <Select
                    options={{STATUS_OPTIONS}}
                    value={{r.status as string}}
                    onChange={{(e) => handleStatusChange(r.id, e.target.value as {ReqType}['status'])}}
                    className="w-40"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" onClick={{() => handleDelete(r.id)}}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}}
          </tbody>
        </table>
      </div>
    </div>
  );
}}
"""


def gen_app_tsx(config: dict) -> str:
    primary = config["primary"]
    categories = config.get("categories")
    requests = config.get("requests")
    PrimaryType = pascal(primary["name"])
    imports = ["Routes, Route, Navigate"]
    page_imports = [
        "import Home from '@/pages/Home';",
        "import { AdminLayout } from '@/admin/components/AdminLayout';",
        "import { AdminRouteGuard } from '@/admin/components/AdminRouteGuard';",
        "import AdminLogin from '@/admin/pages/Login';",
        f"import AdminDashboard from '@/admin/pages/Dashboard';",
        f"import Admin{PrimaryType} from '@/admin/pages/{PrimaryType}';",
    ]
    if categories:
        CatType = pascal(categories["name"])
        page_imports.append(f"import Admin{CatType} from '@/admin/pages/{CatType}';")
    if requests:
        ReqType = pascal(requests["name"])
        page_imports.append(f"import Admin{ReqType} from '@/admin/pages/{ReqType}';")
    page_imports += [
        "import AdminUsers from '@/admin/pages/Users';",
        "import AdminSettings from '@/admin/pages/Settings';",
    ]

    routes = [f'<Route path="/admin/{primary["name"]}" element={{<Admin{PrimaryType} />}} />']
    if categories:
        routes.append(f'<Route path="/admin/{categories["name"]}" element={{<Admin{pascal(categories["name"])} />}} />')
    if requests:
        routes.append(f'<Route path="/admin/{requests["name"]}" element={{<Admin{pascal(requests["name"])} />}} />')

    return f"""import {{ {imports[0]} }} from 'react-router-dom';
{'\n'.join(page_imports)}

export default function App() {{
  return (
    <Routes>
      <Route path="/" element={{<Home />}} />

      <Route path="/admin/login" element={{<AdminLogin />}} />
      <Route element={{<AdminRouteGuard />}}>
        <Route element={{<AdminLayout />}}>
          <Route path="/admin" element={{<AdminDashboard />}} />
          {'\n          '.join(routes)}
          <Route path="/admin/users" element={{<AdminUsers />}} />
          <Route path="/admin/settings" element={{<AdminSettings />}} />
        </Route>
      </Route>

      <Route path="*" element={{<Navigate to="/" replace />}} />
    </Routes>
  );
}}
"""


def gen_main_tsx(has_router: bool) -> str:
    if has_router:
        return ""  # no change needed
    return '''import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './styles/tokens.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

(window as unknown as { __lovecodePreviewReady?: boolean }).__lovecodePreviewReady = true;
if (window.parent !== window) {
  window.parent.postMessage({ type: 'LOVECODE_PREVIEW_READY', ts: Date.now() }, '*');
}
'''


# ---------------------------------------------------------------------------
# PocketBase backend files
# ---------------------------------------------------------------------------
DOCKERFILE = '''FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_POCKETBASE_URL=/api
RUN npm run build

FROM node:20-alpine

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
'''

PB_DOCKERFILE = '''FROM alpine:latest

ARG PB_VERSION=0.22.46
ARG TARGETARCH

RUN apk add --no-cache \\
    unzip \\
    ca-certificates \\
    wget

WORKDIR /pb

RUN case "${TARGETARCH}" in \\
    amd64)  PB_ARCH=linux_amd64 ;; \\
    arm64)  PB_ARCH=linux_arm64 ;; \\
    *)      PB_ARCH=linux_amd64 ;; \\
    esac && \\
    wget -qO pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_ARCH}.zip" && \\
    unzip -q pocketbase.zip && \\
    rm pocketbase.zip && \\
    chmod +x /pb/pocketbase

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=./pb_data"]
'''

NGINX_CONF = '''server {
    listen 3000;
    server_name localhost;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://pocketbase:8090/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
'''

DOCKER_COMPOSE = '''services:
  pocketbase:
    build: ./pocketbase
    container_name: "{{PROJECT_NAME}}-pocketbase"
    volumes:
      - pb_data:/pb/pb_data
    expose:
      - "8090"
    environment:
      - PB_ENCRYPTION_KEY=${PB_ENCRYPTION_KEY:-}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8090/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped

  frontend:
    build: .
    container_name: "{{PROJECT_NAME}}-frontend"
    expose:
      - "3000"
    environment:
      - VITE_POCKETBASE_URL=/api
    depends_on:
      pocketbase:
        condition: service_healthy
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: "{{PROJECT_NAME}}-nginx"
    ports:
      - "3000:3000"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - frontend
      - pocketbase
    restart: unless-stopped

volumes:
  pb_data:
'''

PB_HOOKS = '''// Default new users to the "customer" role
onModelBeforeCreate((e) => {
  const user = e.model;
  if (!user.get('role')) {
    user.set('role', 'customer');
  }
}, 'users');
'''


def js_field(field: dict, collection_ids: dict) -> str:
    t = field["type"]
    base = {
        "system": False,
        "id": f"{collection_ids.get('prefix','')}_{field['name']}",
        "name": field["name"],
        "type": t,
        "required": field.get("required", False),
        "presentable": field.get("presentable", False),
        "unique": field.get("unique", False),
    }
    if t == "text":
        base["options"] = {"min": None, "max": None, "pattern": field.get("pattern", "")}
    elif t == "number":
        opts = field.get("options", {})
        base["options"] = {"min": opts.get("min", 0), "max": opts.get("max", None), "noDecimal": opts.get("noDecimal", False)}
    elif t == "select":
        base["options"] = {"maxSelect": 1, "values": field["options"]["values"]}
    elif t == "relation":
        related = field["related"]
        base["options"] = {
            "collectionId": collection_ids[related],
            "cascadeDelete": False,
            "minSelect": None,
            "maxSelect": 1,
            "displayFields": ["name"] if related != "users" else ["email"],
        }
    elif t == "json":
        base["options"] = {}
    return json.dumps(base, indent=6)


def gen_migration(config: dict) -> str:
    primary = config["primary"]
    categories = config.get("categories")
    requests = config.get("requests")
    template = primary["name"]

    def schema_fields(fields, ids, prefix):
        return ",\n".join(js_field({**f, "_prefix": prefix}, {"prefix": prefix, **ids}) for f in fields)

    # We build the migration manually with string formatting for readability
    lines = []
    lines.append("migrate(")
    lines.append("  (db) => {")
    lines.append("    const dao = new Dao(db);")
    lines.append("")
    lines.append("    const users = dao.findCollectionByNameOrId('users');")
    lines.append("    users.schema = [")
    lines.append("      ...users.schema,")
    for f in [
        {"name": "name", "type": "text"},
        {"name": "role", "type": "select", "options": {"values": ["customer", "admin"]}},
        {"name": "phone", "type": "text"},
        {"name": "address", "type": "text"},
    ]:
        lines.append(f"      {js_field(f, {'prefix':'users'})},")
    lines.append("    ];")
    lines.append("    dao.saveCollection(users);")
    lines.append("")

    collection_ids = {"users": "users"}

    def add_collection(name, fields, indexes, list_rule, view_rule, create_rule, update_rule, delete_rule, prefix):
        lines.append(f"    const {name} = new Collection({{")
        lines.append(f"      id: '{name}',")
        lines.append(f"      name: '{name}',")
        lines.append("      type: 'base',")
        lines.append("      system: false,")
        lines.append("      schema: [")
        for field in fields:
            field_json = js_field(field, {"prefix": prefix, **collection_ids})
            lines.append(f"        {field_json},")
        lines.append("      ],")
        lines.append(f"      indexes: {json.dumps(indexes)},")
        lines.append(f"      listRule: {json.dumps(list_rule)},")
        lines.append(f"      viewRule: {json.dumps(view_rule)},")
        lines.append(f"      createRule: {json.dumps(create_rule)},")
        lines.append(f"      updateRule: {json.dumps(update_rule)},")
        lines.append(f"      deleteRule: {json.dumps(delete_rule)},")
        lines.append("      options: {},")
        lines.append("    });")
        lines.append(f"    dao.saveCollection({name});")
        lines.append("")

    if categories:
        cat_name = categories["name"]
        add_collection(
            cat_name,
            categories["fields"],
            [f"CREATE UNIQUE INDEX `idx_{cat_name}_slug` ON `{cat_name}` (`slug`)"],
            "",
            "",
            '@request.auth.role = "admin"',
            '@request.auth.role = "admin"',
            '@request.auth.role = "admin"',
            cat_name,
        )
        collection_ids[cat_name] = cat_name

    primary_status_values = next((f["options"]["values"] for f in primary["fields"] if f["type"] == "select"), [])
    published_filter = f'status = "{primary_status_values[0]}"' if primary_status_values else ""
    add_collection(
        primary["name"],
        primary["fields"],
        [f"CREATE UNIQUE INDEX `idx_{primary['name']}_slug` ON `{primary['name']}` (`slug`)"],
        published_filter,
        published_filter,
        '@request.auth.role = "admin"',
        '@request.auth.role = "admin"',
        '@request.auth.role = "admin"',
        primary["name"],
    )
    collection_ids[primary["name"]] = primary["name"]

    if requests:
        add_collection(
            requests["name"],
            requests["fields"],
            [],
            'user = @request.auth.id',
            'user = @request.auth.id',
            '@request.auth.id != ""',
            '@request.auth.role = "admin"',
            '@request.auth.role = "admin"',
            requests["name"],
        )
        collection_ids[requests["name"]] = requests["name"]

    # rollback
    lines.append("  },")
    lines.append("  (db) => {")
    lines.append("    const dao = new Dao(db);")
    lines.append("    try {")
    lines.append("      const users = dao.findCollectionByNameOrId('users');")
    lines.append("      users.schema = users.schema.filter((f) => !['name', 'role', 'phone', 'address'].includes(f.name));")
    lines.append("      dao.saveCollection(users);")
    lines.append("    } catch (_) { /* ignore */ }")
    lines.append("")
    to_delete = []
    if requests:
        to_delete.append(requests["name"])
    to_delete.append(primary["name"])
    if categories:
        to_delete.append(categories["name"])
    lines.append(f"    const collections = {json.dumps(to_delete)};")
    lines.append("    for (const name of collections) {")
    lines.append("      try {")
    lines.append("        const collection = dao.findCollectionByNameOrId(name);")
    lines.append("        dao.deleteCollection(collection);")
    lines.append("      } catch (_) { /* ignore */ }")
    lines.append("    }")
    lines.append("  },")
    lines.append(");")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main():
    for template, config in CONFIG.items():
        src_dir = TEMPLATES_DIR / template / "src"
        admin_dir = src_dir / "admin"
        components_dir = admin_dir / "components"
        pages_dir = admin_dir / "pages"

        print(f"Scaffolding {template}...")
        write(components_dir / "ui.tsx", UI_TSX)
        write(components_dir / "AdminRouteGuard.tsx", ADMIN_ROUTE_GUARD_TSX)
        write(components_dir / "AdminLayout.tsx", gen_admin_layout(config))
        write(pages_dir / "Login.tsx", gen_login(config))
        write(pages_dir / "Dashboard.tsx", gen_dashboard(config))
        write(pages_dir / "Users.tsx", gen_users())
        write(pages_dir / "Settings.tsx", gen_settings_fixed(config))

        PrimaryType = pascal(config["primary"]["name"])
        write(pages_dir / f"{PrimaryType}.tsx", gen_items_page(config))
        if config.get("categories"):
            CatType = pascal(config["categories"]["name"])
            write(pages_dir / f"{CatType}.tsx", gen_categories_page(config))
        if config.get("requests"):
            ReqType = pascal(config["requests"]["name"])
            write(pages_dir / f"{ReqType}.tsx", gen_requests_page(config))

        write(src_dir / "lib" / "pocketbase.ts", gen_pocketbase_ts(config))
        write(src_dir / "App.tsx", gen_app_tsx(config))

        has_router = (src_dir / "main.tsx").read_text(encoding="utf-8").find("BrowserRouter") != -1
        if not has_router:
            write(src_dir / "main.tsx", gen_main_tsx(False))

        # PocketBase backend
        pb_dir = TEMPLATES_DIR / f"pocketbase-{template}"
        write(pb_dir / "Dockerfile", DOCKERFILE)
        write(pb_dir / "docker-compose.yaml", DOCKER_COMPOSE)
        write(pb_dir / "nginx.conf", NGINX_CONF)
        write(pb_dir / "pocketbase" / "Dockerfile", PB_DOCKERFILE)
        write(pb_dir / "pocketbase" / "pb_hooks" / "main.pb.js", PB_HOOKS)
        write(pb_dir / "pocketbase" / "pb_migrations" / f"1749767600_{template}.js", gen_migration(config))

    print("Done.")


if __name__ == "__main__":
    main()
