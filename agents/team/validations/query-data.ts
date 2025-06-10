import schema from '@/instant.schema';
import { z } from 'zod';

export const queryDataValidation = (query: unknown) => {
  const entityFields: Record<string, string[]> = {};
  const entityRelations: Record<string, string[]> = {};

  Object.entries(schema.entities).forEach(([entity, def]) => {
    entityFields[entity] = [...Object.keys(def.attrs), 'id', 'serverCreatedAt'];
    entityRelations[entity] = [];
  });

  Object.values(schema.links).forEach((link) => {
    if (typeof link.forward.on === 'string') {
      entityRelations[link.forward.on].push(link.forward.label);
    }

    if (typeof link.reverse.on === 'string') {
      entityRelations[link.reverse.on].push(link.reverse.label);
    }
  });

  const operatorSchema = z
    .object({
      $gt: z.any().optional(),
      $lt: z.any().optional(),
      $gte: z.any().optional(),
      $lte: z.any().optional(),
      $in: z.array(z.any()).optional(),
      $not: z.any().optional(),
      $isNull: z.boolean().optional(),
      $like: z.string().optional(),
      $ilike: z.string().optional(),
    })
    .strict();

  const createWhereSchema = (fields: string[], relations: string[]) =>
    z
      .object(
        Object.fromEntries([
          ...fields.map((f) => [
            f,
            z.union([z.any(), operatorSchema]).optional(),
          ]),
          ...relations.map((r) => [
            r,
            z.union([z.any(), operatorSchema]).optional(),
          ]),
        ])
      )
      .strict()
      .or(
        z
          .object({
            and: z.array(z.any()).optional(),
            or: z.array(z.any()).optional(),
          })
          .strict()
      );

  const getRelatedEntity = (label: string) => {
    for (const link of Object.values(schema.links)) {
      if (link.forward.label === label) return link.reverse.on as string;
      if (link.reverse.label === label) return link.forward.on as string;
    }

    return '';
  };

  const createEntityQuerySchema = (entity: string): z.ZodTypeAny => {
    const fields = entityFields[entity] || [];
    const relations = entityRelations[entity] || [];

    return z
      .object({
        $: z
          .object({
            where: createWhereSchema(fields, relations).optional(),
            fields:
              fields.length > 0
                ? z.array(z.enum(fields as [string, ...string[]])).optional()
                : z.undefined(),
            limit: z.number().int().positive().optional(),
            offset: z.number().int().nonnegative().optional(),
            order:
              fields.length > 0
                ? z
                    .object(
                      Object.fromEntries(
                        fields.map((f) => [f, z.enum(['asc', 'desc'])])
                      )
                    )
                    .partial()
                    .optional()
                : z.undefined(),
          })
          .optional(),
        ...Object.fromEntries(
          relations.map((rel) => [
            rel,
            z.lazy(() => createEntityQuerySchema(getRelatedEntity(rel))),
          ])
        ),
      })
      .partial();
  };

  const rootSchema = z.object(
    Object.fromEntries(
      Object.keys(schema.entities).map((entity) => [
        entity,
        createEntityQuerySchema(entity).optional(),
      ])
    )
  );

  return rootSchema.parse(query);
};
