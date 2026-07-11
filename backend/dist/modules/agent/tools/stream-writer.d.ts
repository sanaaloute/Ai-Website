export interface AgentToolEvent {
    type: string;
    data: Record<string, unknown>;
}
export interface StreamWriter {
    write(event: AgentToolEvent): void;
}
export declare class NoOpStreamWriter implements StreamWriter {
    write(_event: AgentToolEvent): void;
}
export declare class CallbackStreamWriter implements StreamWriter {
    private readonly callback;
    constructor(callback: (event: AgentToolEvent) => void | Promise<void>);
    write(event: AgentToolEvent): void;
}
export declare function createFileUpdateEvent(path: string, content: string, status: string): AgentToolEvent;
