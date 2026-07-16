import { Injectable, Logger } from '@nestjs/common';
import { E2BService } from '@/lib/e2b.service';
import { DatabaseStatus, DatabaseCollectionStatus } from '../state';

interface SchemaField {
  name: string;
  type: string;
  required?: boolean;
  options?: Record<string, unknown>;
}

interface CollectionSchema {
  id?: string;
  name: string;
  type?: string;
  system?: boolean;
  schema?: SchemaField[];  listRule?: string;
  viewRule?: string;
  createRule?: string;
  updateRule?: string;
  deleteRule?: string;}

interface PbRecord {
  id?: string;
  [key: string]: unknown;
}

interface PbCollection {
  id: string;
  name: string;
  type: string;
  schema?: SchemaField[];
}

@Injectable()
export class DatabaseSeederService {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(private readonly e2b: E2BService) {}

  async verifyAndSeed(
    sandboxId: string,
    category: string,
    dbSchemaTemplate?: Record<string, unknown>,
  ): Promise<DatabaseStatus> {
    const pbInfo = await this.e2b.getPocketbaseInfo(sandboxId);
    if (!pbInfo) {
      return this.buildStatus('PocketBase is not configured for this sandbox', [], false);
    }

    const expectedCollections = this.extractExpectedCollections(dbSchemaTemplate, category);
    if (!expectedCollections.length) {
      return this.buildStatus(
        `No PocketBase schema template found for category ${category}`,
        [],
        false,
      );
    }

    let token: string | undefined;
    try {
      token = await this.authenticateAdmin(pbInfo.url, pbInfo.adminEmail, pbInfo.adminPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return this.buildStatus(`PocketBase admin auth failed: ${message}`, [], false);
    }

    let actualCollections = await this.listCollections(pbInfo.url, token);

    const missing = expectedCollections.filter(
      (expected) => !actualCollections.some((c) => c.name === expected.name),
    );

    if (missing.length > 0) {
      if (Array.isArray(dbSchemaTemplate?.collections) && dbSchemaTemplate.collections.length > 0) {
        this.logger.log(`Creating missing PocketBase collections for ${category}: ${missing.map((c) => c.name).join(', ')}`);
        await this.createMissingCollections(pbInfo.url, token, missing);
        actualCollections = await this.listCollections(pbInfo.url, token);
      } else {
        this.logger.log(
          `Missing PocketBase collections for ${category}: ${missing.map((c) => c.name).join(', ')}. Reconfiguring...`,
        );
        const reconfigured = await this.e2b.reconfigurePocketbaseForCategory(sandboxId, category);
        if (!reconfigured) {
          return this.buildStatus(
            `Could not reconfigure PocketBase for ${category}; missing collections: ${missing.map((c) => c.name).join(', ')}`,
            [],
            false,
          );
        }
        token = await this.authenticateAdmin(
          reconfigured.url,
          reconfigured.adminEmail,
          reconfigured.adminPassword,
        );
        actualCollections = await this.listCollections(reconfigured.url, token);
      }
    }

    const statuses: DatabaseCollectionStatus[] = [];
    let totalSeeded = 0;

    for (const expectedCollection of expectedCollections) {
      const collection = actualCollections.find((c) => c.name === expectedCollection.name);
      if (!collection) {
        statuses.push({ name: expectedCollection.name, exists: false, recordCount: 0, seeded: 0 });
        continue;
      }

      const recordCount = await this.countRecords(pbInfo.url, token, expectedCollection.name);
      let seeded = 0;

      if (recordCount === 0 && expectedCollection.name === 'settings') {
        const records = this.generateSampleRecords(expectedCollection.name, expectedCollection, category);
        for (const record of records) {
          try {
            await this.createRecord(pbInfo.url, token, expectedCollection.name, record);
            seeded++;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Failed to seed ${expectedCollection.name}: ${message}`);
          }
        }
        totalSeeded += seeded;
      }

      statuses.push({
        name: expectedCollection.name,
        exists: true,
        recordCount: recordCount + seeded,
        seeded,
      });
    }

    const allExist = statuses.every((s) => s.exists);
    const dataAvailable = statuses.some((s) => s.exists && s.recordCount > 0);

    const message = allExist
      ? `Database verified for ${category}. ${statuses.length} collections are present.`
      : `Database verification incomplete for ${category}. Missing: ${statuses
          .filter((s) => !s.exists)
          .map((s) => s.name)
          .join(', ')}`;

    return this.buildStatus(message, statuses, dataAvailable);
  }

  private buildStatus(message: string, collections: DatabaseCollectionStatus[], dataAvailable: boolean): DatabaseStatus {
    return {
      checked: true,
      collections,
      allExist: collections.every((c) => c.exists),
      dataAvailable,
      message,
    };
  }

  private extractExpectedCollections(
    dbSchemaTemplate: Record<string, unknown> | undefined,
    category: string,
  ): CollectionSchema[] {
    const collections = dbSchemaTemplate?.collections;
    if (Array.isArray(collections)) {
      return collections
        .map((c: CollectionSchema) => c)
        .filter((collection) => collection.name && collection.name !== 'users');
    }

    // Fallback for categories that still lack a db_schema.json.
    const fallback: Record<string, string[]> = {
      ecommerce: ['categories', 'products', 'orders', 'order_items', 'reviews', 'settings'],
      blog: ['posts', 'categories', 'settings'],
      restaurant: ['menu_items', 'categories', 'reservations', 'settings'],
      travel: ['tours', 'categories', 'bookings', 'settings'],
      job_portal: ['jobs', 'categories', 'applications', 'settings'],
      real_estate: ['properties', 'categories', 'inquiries', 'settings'],
      portfolio: ['projects', 'testimonials', 'settings'],
      education: ['courses', 'lessons', 'categories', 'settings'],
      health: ['appointments', 'services', 'settings'],
      saas: ['contacts', 'pages', 'settings'],
      fashion: ['products', 'categories', 'orders', 'order_items', 'settings'],
      automobile: ['vehicles', 'categories', 'inquiries', 'settings'],
      personal: ['posts', 'pages', 'settings'],
      generic: ['pages', 'contacts', 'settings'],
    };

    return (fallback[category] ?? ['settings']).map((name) => ({ name, type: 'base' }));
  }

  private async authenticateAdmin(url: string, email: string, password: string): Promise<string> {
    const res = await fetch(`${url}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    });
    if (!res.ok) {
      throw new Error(`Admin auth failed: ${res.status}`);
    }
    const data = (await res.json()) as { token?: string };
    if (!data.token) {
      throw new Error('Admin auth response missing token');
    }
    return data.token;
  }

  private async listCollections(url: string, token: string): Promise<PbCollection[]> {
    const res = await fetch(`${url}/api/collections?perPage=200`, {
      headers: { Authorization: token },
    });
    if (!res.ok) {
      throw new Error(`Could not list collections: ${res.status}`);
    }
    const data = (await res.json()) as { items?: PbCollection[] };
    return data.items ?? [];
  }

  private async createMissingCollections(
    url: string,
    token: string,
    missingCollections: CollectionSchema[],
  ): Promise<void> {
    for (const collection of missingCollections) {
      try {
        await this.createCollection(url, token, collection);
        this.logger.log(`Created PocketBase collection: ${collection.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to create PocketBase collection ${collection.name}: ${message}`);
      }
    }
  }

  private async createCollection(
    url: string,
    token: string,
    collection: CollectionSchema,
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      name: collection.name,
      type: collection.type || 'base',
      schema: collection.schema ?? [],
    };

    if (collection.listRule) payload.listRule = collection.listRule;
    if (collection.viewRule) payload.viewRule = collection.viewRule;
    if (collection.createRule) payload.createRule = collection.createRule;
    if (collection.updateRule) payload.updateRule = collection.updateRule;
    if (collection.deleteRule) payload.deleteRule = collection.deleteRule;

    const res = await fetch(`${url}/api/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Could not create collection ${collection.name}: ${res.status} ${body}`);
    }
  }

  private async countRecords(url: string, token: string, collectionName: string): Promise<number> {
    const res = await fetch(`${url}/api/collections/${collectionName}/records?perPage=1`, {
      headers: { Authorization: token },
    });
    if (!res.ok) {
      return 0;
    }
    const data = (await res.json()) as { totalItems?: number };
    return data.totalItems ?? 0;
  }

  private async createRecord(
    url: string,
    token: string,
    collectionName: string,
    record: PbRecord,
  ): Promise<void> {
    const res = await fetch(`${url}/api/collections/${collectionName}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Create failed: ${res.status} ${body}`);
    }
  }

  private generateSampleRecords(
    collectionName: string,
    schema: CollectionSchema | PbCollection,
    category: string,
    count = 3,
  ): PbRecord[] {
    if (collectionName !== 'settings') {
      return [];
    }

    const templates = this.getTemplates(collectionName, category);
    if (templates.length) {
      return [templates[0]];
    }

    const fields = (schema as CollectionSchema).schema ?? [];
    const record: PbRecord = {};
    for (const field of fields) {
      if (!field.required || field.name === 'id') continue;
      record[field.name] = this.generateValue(field, 1);
    }
    return record.name ? [record] : [];
  }

  private getTemplates(collectionName: string, category: string): PbRecord[] {
    const brand = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    switch (collectionName) {
      case 'categories':
        return [
          { name: 'Featured', slug: 'featured' },
          { name: 'New Arrivals', slug: 'new-arrivals' },
        ];
      case 'products':
        return [
          {
            name: 'Demo Product One',
            slug: 'demo-product-one',
            price: 29.99,
            stock: 100,
            status: 'active',
            description: 'A sample product to get your storefront started.',
          },
          {
            name: 'Demo Product Two',
            slug: 'demo-product-two',
            price: 49.99,
            stock: 50,
            status: 'active',
            description: 'Another sample product while you add your catalog.',
          },
          {
            name: 'Demo Product Three',
            slug: 'demo-product-three',
            price: 19.99,
            stock: 200,
            status: 'active',
            description: 'A budget-friendly sample product.',
          },
        ];
      case 'posts':
        return [
          {
            title: 'Welcome to your new blog',
            slug: 'welcome',
            content: 'This is a sample post. Add your own content from the admin dashboard.',
            status: 'published',
          },
        ];
      case 'pages':
        return [
          {
            title: 'About',
            slug: 'about',
            content: `Learn more about ${brand}.`,
            status: 'published',
          },
        ];
      case 'settings':
        return [
          {
            name: brand,
            tagline: `A ${category} site built with AI-Website`,
            currency: 'USD',
            footerText: `© ${new Date().getFullYear()} ${brand}. All rights reserved.`,
          },
        ];
      case 'tours':
        return [
          {
            title: 'Sample Tour',
            slug: 'sample-tour',
            description: 'A sample tour while you build your travel catalog.',
            price: 999,
            duration: '7 days',
          },
        ];
      case 'jobs':
        return [
          {
            title: 'Sample Job Opening',
            slug: 'sample-job',
            description: 'A sample job listing. Replace with your own openings.',
            location: 'Remote',
            type: 'full-time',
          },
        ];
      case 'projects':
        return [
          {
            title: 'Sample Project',
            slug: 'sample-project',
            description: 'A sample project for your portfolio.',
            link: 'https://example.com',
          },
        ];
      case 'testimonials':
        return [
          {
            author: 'Jane Doe',
            role: 'Customer',
            quote: 'This is a sample testimonial. Replace it with real feedback.',
          },
        ];
      case 'menu_items':
        return [
          { name: 'Sample Dish', price: 12.99, description: 'A sample menu item.', category: 'mains' },
        ];
      case 'contacts':
        return [
          { name: 'Sample Contact', email: 'hello@example.com', message: 'A sample inquiry.', status: 'new' },
        ];
      default:
        return [];
    }
  }

  private generateValue(field: SchemaField, index: number): unknown {
    switch (field.type) {
      case 'text':
        return `Sample ${field.name} ${index}`;
      case 'number':
        return index;
      case 'bool':
        return false;
      case 'select': {
        const values = (field.options?.values as string[] | undefined) ?? [];
        return values[0] ?? 'draft';
      }
      case 'date':
        return new Date().toISOString();
      case 'json':
        return {};
      case 'email':
        return `sample${index}@example.com`;
      case 'url':
        return 'https://example.com';
      default:
        return undefined;
    }
  }
}
