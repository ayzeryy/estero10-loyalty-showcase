


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."add_points"("p_user_id" "uuid", "p_points" integer, "p_description" "text" DEFAULT 'Compra'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Solo permitir cantidades positivas
  if p_points <= 0 then
    raise exception 'Points must be greater than zero';
  end if;

  -- Actualizar saldo
  update public.loyalty_accounts
  set
    points_balance = points_balance + p_points,
    lifetime_points = lifetime_points + p_points
  where user_id = p_user_id;

  if not found then
    raise exception 'Loyalty account not found';
  end if;

  -- Registrar movimiento
  insert into public.point_transactions (
    user_id,
    type,
    points,
    description
  )
  values (
    p_user_id,
    'purchase',
    p_points,
    p_description
  );
end;
$$;


ALTER FUNCTION "public"."add_points"("p_user_id" "uuid", "p_points" integer, "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_purchase_qr"("p_purchase_amount" numeric) RETURNS TABLE("token" "uuid", "points" integer, "purchase_amount" numeric, "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid;
  v_percentage numeric;
  v_expiration_minutes integer;
  v_points integer;
begin

  -- Usuario autenticado
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Solo empleados/admins activos
  if not exists (
    select 1
    from public.staff_members
    where user_id = v_user_id
      and active = true
      and role in ('employee', 'admin')
  ) then
    raise exception 'Not authorized';
  end if;

  -- Validar monto
  if p_purchase_amount is null or p_purchase_amount <= 0 then
    raise exception 'Invalid purchase amount';
  end if;

  -- Obtener configuración
  select
    points_percentage,
    qr_expiration_minutes
  into
    v_percentage,
    v_expiration_minutes
  from public.loyalty_settings
  where id = 1;

  if not found then
    raise exception 'Loyalty settings not found';
  end if;

  -- Ejemplo:
  -- Q500 * 20% = 100 puntos
  v_points := floor(
    p_purchase_amount * (v_percentage / 100)
  );

  if v_points <= 0 then
    raise exception 'Purchase does not generate points';
  end if;

  -- Crear QR y devolver sus datos
  return query
  insert into public.qr_tokens (
    points,
    purchase_amount,
    description,
    expires_at
  )
  values (
    v_points,
    p_purchase_amount,
    'Compra en restaurante',
    now() + make_interval(mins => v_expiration_minutes)
  )
  returning
    qr_tokens.token,
    qr_tokens.points,
    qr_tokens.purchase_amount,
    qr_tokens.expires_at;

end;
$$;


ALTER FUNCTION "public"."create_purchase_qr"("p_purchase_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.loyalty_accounts (user_id)
  values (new.id);

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_qr"("p_token" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid;
  v_qr public.qr_tokens%rowtype;
begin
  -- Obtener usuario autenticado
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Buscar y bloquear el QR durante la operación
  select *
  into v_qr
  from public.qr_tokens
  where token = p_token
  for update;

  if not found then
    raise exception 'Invalid QR code';
  end if;

  -- Evitar doble uso
  if v_qr.redeemed_at is not null then
    raise exception 'QR code already redeemed';
  end if;

  -- Revisar expiración
  if v_qr.expires_at < now() then
    raise exception 'QR code expired';
  end if;

  -- Acreditar puntos
  update public.loyalty_accounts
  set
    points_balance = points_balance + v_qr.points,
    lifetime_points = lifetime_points + v_qr.points
  where user_id = v_user_id;

  if not found then
    raise exception 'Loyalty account not found';
  end if;

  -- Registrar historial
  insert into public.point_transactions (
    user_id,
    type,
    points,
    description
  )
  values (
    v_user_id,
    'purchase',
    v_qr.points,
    coalesce(v_qr.description, 'Compra en restaurante')
  );

  -- Quemar QR
  update public.qr_tokens
  set
    redeemed_at = now(),
    redeemed_by = v_user_id
  where id = v_qr.id;

  return v_qr.points;
end;
$$;


ALTER FUNCTION "public"."redeem_qr"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid;
  v_reward public.rewards%rowtype;
  v_balance integer;
  v_redemption_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;

  select *
  into v_reward
  from public.rewards
  where id = p_reward_id
    and active = true;

  if not found then
    raise exception 'Reward not available';
  end if;

  -- Bloquear la cuenta durante el canje
  select points_balance
  into v_balance
  from public.loyalty_accounts
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'Loyalty account not found';
  end if;

  if v_balance < v_reward.points_required then
    raise exception 'Not enough points';
  end if;

  -- Descontar puntos
  update public.loyalty_accounts
  set points_balance =
    points_balance - v_reward.points_required
  where user_id = v_user_id;

  -- Registrar movimiento negativo
  insert into public.point_transactions (
    user_id,
    type,
    points,
    description
  )
  values (
    v_user_id,
    'reward',
    -v_reward.points_required,
    'Canje: ' || v_reward.name
  );

  -- Crear comprobante del canje
  insert into public.reward_redemptions (
    user_id,
    reward_id,
    points_spent
  )
  values (
    v_user_id,
    v_reward.id,
    v_reward.points_required
  )
  returning id into v_redemption_id;

  return v_redemption_id;
end;
$$;


ALTER FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."use_reward"("p_redemption_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_staff_id uuid;
  v_redemption public.reward_redemptions%rowtype;
  v_reward_name text;
begin

  -- Usuario que está intentando validar el premio
  v_staff_id := auth.uid();

  if v_staff_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Verificar que sea empleado/admin activo
  if not exists (
    select 1
    from public.staff_members
    where user_id = v_staff_id
      and active = true
      and role in ('employee', 'admin')
  ) then
    raise exception 'Not authorized';
  end if;

  -- Buscar y bloquear el canje
  select *
  into v_redemption
  from public.reward_redemptions
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'Redemption not found';
  end if;

  if v_redemption.status = 'used' then
    raise exception 'Reward already used';
  end if;

  if v_redemption.status = 'cancelled' then
    raise exception 'Reward cancelled';
  end if;

  if v_redemption.status <> 'pending' then
    raise exception 'Reward is not available';
  end if;

  select name
  into v_reward_name
  from public.rewards
  where id = v_redemption.reward_id;

  -- Marcar premio como utilizado
  update public.reward_redemptions
  set
    status = 'used',
    used_at = now()
  where id = v_redemption.id;

  return coalesce(v_reward_name, 'Reward');

end;
$$;


ALTER FUNCTION "public"."use_reward"("p_redemption_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "points_balance" integer DEFAULT 0 NOT NULL,
    "lifetime_points" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loyalty_accounts_lifetime_points_check" CHECK (("lifetime_points" >= 0)),
    CONSTRAINT "loyalty_accounts_points_balance_check" CHECK (("points_balance" >= 0))
);


ALTER TABLE "public"."loyalty_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."loyalty_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "points_percentage" numeric(5,2) DEFAULT 20 NOT NULL,
    "qr_expiration_minutes" integer DEFAULT 60 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loyalty_settings_id_check" CHECK (("id" = 1)),
    CONSTRAINT "loyalty_settings_points_percentage_check" CHECK ((("points_percentage" >= (0)::numeric) AND ("points_percentage" <= (100)::numeric))),
    CONSTRAINT "loyalty_settings_qr_expiration_minutes_check" CHECK (("qr_expiration_minutes" > 0))
);


ALTER TABLE "public"."loyalty_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "points" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "point_transactions_type_check" CHECK (("type" = ANY (ARRAY['purchase'::"text", 'reward'::"text", 'adjustment'::"text", 'promotion'::"text"])))
);


ALTER TABLE "public"."point_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "price" numeric(10,2) NOT NULL,
    "image_url" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_price_check" CHECK (("price" >= (0)::numeric))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "phone" "text",
    "birthday" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qr_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "points" integer NOT NULL,
    "purchase_amount" numeric(10,2),
    "description" "text" DEFAULT 'Compra en restaurante'::"text",
    "expires_at" timestamp with time zone NOT NULL,
    "redeemed_at" timestamp with time zone,
    "redeemed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "qr_tokens_points_check" CHECK (("points" > 0))
);


ALTER TABLE "public"."qr_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reward_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reward_id" "uuid" NOT NULL,
    "points_spent" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "used_at" timestamp with time zone,
    CONSTRAINT "reward_redemptions_points_spent_check" CHECK (("points_spent" > 0)),
    CONSTRAINT "reward_redemptions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'used'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."reward_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "points_required" integer NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "rewards_points_required_check" CHECK (("points_required" > 0))
);


ALTER TABLE "public"."rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_members_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."loyalty_settings"
    ADD CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_tokens"
    ADD CONSTRAINT "qr_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qr_tokens"
    ADD CONSTRAINT "qr_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rewards"
    ADD CONSTRAINT "rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "point_transactions_user_id_created_at_idx" ON "public"."point_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "products_category_id_idx" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "qr_tokens_token_idx" ON "public"."qr_tokens" USING "btree" ("token");



CREATE INDEX "reward_redemptions_user_id_idx" ON "public"."reward_redemptions" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."loyalty_accounts"
    ADD CONSTRAINT "loyalty_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."point_transactions"
    ADD CONSTRAINT "point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."qr_tokens"
    ADD CONSTRAINT "qr_tokens_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id");



ALTER TABLE ONLY "public"."reward_redemptions"
    ADD CONSTRAINT "reward_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view active categories" ON "public"."categories" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Anyone can view active products" ON "public"."products" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Authenticated users can view active rewards" ON "public"."rewards" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Staff can view own role" ON "public"."staff_members" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view own loyalty account" ON "public"."loyalty_accounts" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own point transactions" ON "public"."point_transactions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view own reward redemptions" ON "public"."reward_redemptions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."loyalty_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."point_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qr_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reward_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rewards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_points"("p_user_id" "uuid", "p_points" integer, "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_points"("p_user_id" "uuid", "p_points" integer, "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_purchase_qr"("p_purchase_amount" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_purchase_qr"("p_purchase_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_purchase_qr"("p_purchase_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_qr"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_qr"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_qr"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redeem_reward"("p_reward_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."use_reward"("p_redemption_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."use_reward"("p_redemption_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."use_reward"("p_redemption_id" "uuid") TO "authenticated";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_accounts" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."loyalty_settings" TO "anon";
GRANT ALL ON TABLE "public"."loyalty_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."loyalty_settings" TO "service_role";



GRANT ALL ON TABLE "public"."point_transactions" TO "anon";
GRANT ALL ON TABLE "public"."point_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."point_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."qr_tokens" TO "anon";
GRANT ALL ON TABLE "public"."qr_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."qr_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."reward_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."reward_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."reward_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."rewards" TO "anon";
GRANT ALL ON TABLE "public"."rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."rewards" TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







