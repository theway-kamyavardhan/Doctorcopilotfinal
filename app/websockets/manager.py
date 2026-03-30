from collections import defaultdict
from uuid import UUID

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[UUID, dict[str, WebSocket]] = defaultdict(dict)

    async def connect(self, case_id: UUID, websocket: WebSocket, user_id) -> None:
        await websocket.accept()
        self.active_connections[case_id][str(user_id)] = websocket

    def disconnect(self, case_id: UUID, user_id) -> None:
        room = self.active_connections.get(case_id, {})
        room.pop(str(user_id), None)
        if not room and case_id in self.active_connections:
            del self.active_connections[case_id]

    async def broadcast_case_message(self, case_id: UUID, message) -> None:
        payload = {
            "id": str(message.id),
            "case_id": str(message.case_id),
            "sender_user_id": str(message.sender_user_id),
            "sender_type": message.sender_type,
            "content": message.content,
            "message_type": message.message_type,
            "created_at": message.created_at.isoformat(),
            "updated_at": message.updated_at.isoformat(),
        }
        for connection in self.active_connections.get(case_id, {}).values():
            await connection.send_json(payload)


connection_manager = ConnectionManager()
