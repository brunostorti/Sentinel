import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  eventsRange,
  eventsToCsv,
  MAX_EVENTS_PER_QUERY,
  parseEventsFilter,
  RECENT_EVENTS_LIMIT,
  type ExportableEvent,
} from "@/lib/rag/document-events-filter";

/**
 * Registro de atividades dos documentos da empresa.
 * GET ?mode=recent | month&year&month | period&from&to  [&format=csv]
 * Só ADMIN e RH da empresa (a RLS também limita). O registro não expira.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const { data: caller } = await supabase.from("users").select("company_id, role").eq("auth_id", user.id).single();
  if (!caller?.company_id) return NextResponse.json({ error: "Sem empresa." }, { status: 403 });
  if (caller.role !== "HR" && caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Só RH e administradores veem o registro." }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const filter = parseEventsFilter(params);
  const range = eventsRange(filter);

  let query = supabase
    .from("kb_document_events")
    .select("id, document_title, action, details, created_at, users(name)")
    .eq("company_id", caller.company_id)
    .order("created_at", { ascending: false })
    .limit(range ? MAX_EVENTS_PER_QUERY : RECENT_EVENTS_LIMIT);
  if (range) query = query.gte("created_at", range.from).lt("created_at", range.to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Falha ao carregar o registro." }, { status: 500 });

  const events = (data ?? []).map((e) => ({
    id: e.id as string,
    document_title: e.document_title as string,
    action: e.action as ExportableEvent["action"],
    details: (e.details as Record<string, unknown> | null) ?? {},
    created_at: e.created_at as string,
    actor: (e.users as unknown as { name: string } | null)?.name ?? null,
  }));

  if (params.get("format") === "csv") {
    const label =
      filter.mode === "month"
        ? `${filter.year}-${String(filter.month).padStart(2, "0")}`
        : filter.mode === "period"
          ? `${filter.from}_a_${filter.to}`
          : "ultimos";
    return new NextResponse(eventsToCsv(events), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="registro-documentos-${label}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ events, truncated: !!range && events.length >= MAX_EVENTS_PER_QUERY });
}
