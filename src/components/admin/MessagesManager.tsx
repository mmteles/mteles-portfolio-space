import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Check } from "lucide-react";

export default function MessagesManager() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setMessages(data || []);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("contact_messages").update({ is_read: true }).eq("id", id);
    loadMessages();
  };

  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          Messages
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No messages yet.</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-4 rounded-lg border ${
                  msg.is_read ? "bg-muted/30" : "bg-card border-primary/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{msg.name}</span>
                      <span className="text-sm text-muted-foreground truncate">
                        ({msg.email})
                      </span>
                      {!msg.is_read && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-sm mb-1">{msg.subject}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {msg.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(msg.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!msg.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(msg.id)}
                      className="shrink-0 gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
