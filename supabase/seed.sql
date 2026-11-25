-- Fictional catalog for an isolated local portfolio demo; not the restaurant menu.
begin;

insert into public.loyalty_settings (id, points_percentage, qr_expiration_minutes)
values (1, 20, 60)
on conflict (id) do update set points_percentage = excluded.points_percentage,
  qr_expiration_minutes = excluded.qr_expiration_minutes;

insert into public.categories (id, name, sort_order, active) values
('d2000000-0000-4000-8000-000000000001', 'Frescos del mar', 1, true),
('d2000000-0000-4000-8000-000000000002', 'Para acompañar', 2, true)
on conflict (id) do nothing;

insert into public.products (id, category_id, name, description, price, image_url, active) values
('d3000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001',
 'Ceviche de la casa', 'Ejemplo de catálogo: pescado, cítricos y hierbas frescas.', 85, null, true),
('d3000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000001',
 'Pesca al grill', 'Ejemplo de catálogo: pescado a la plancha con guarnición.', 125, null, true),
('d3000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000002',
 'Limonada fresca', 'Ejemplo de catálogo: limón recién exprimido.', 25, null, true)
on conflict (id) do nothing;

insert into public.rewards (id, name, description, points_required, active) values
('d4000000-0000-4000-8000-000000000001', 'Una limonada para ti', 'Premio ficticio para demostrar un canje.', 50, true),
('d4000000-0000-4000-8000-000000000002', 'Un detalle dulce', 'Premio ficticio para acompañar tu próxima visita.', 100, true),
('d4000000-0000-4000-8000-000000000003', 'Un sabor del mar', 'Premio ficticio para demostrar progreso de puntos.', 250, true)
on conflict (id) do nothing;

commit;
