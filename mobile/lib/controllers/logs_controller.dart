import 'dart:async';
import 'dart:convert';
import 'package:flutter_client_sse/constants/sse_request_type_enum.dart';
import 'package:flutter_client_sse/flutter_client_sse.dart';
import 'package:get/get.dart';

class LogsController extends GetxController {
  var events = <Map<String, dynamic>>[].obs; // Lista reactiva de JSON
  StreamSubscription<SSEModel>? _subscription;

  void listen() {
    _subscription =
        SSEClient.subscribeToSSE(
          method: SSERequestType.GET, // Según el ejemplo oficial
          url: 'https://492131f574ab.ngrok-free.app/api/slave/slave-0/get-logs',
          header: {"Accept": "text/event-stream", "Cache-Control": "no-cache"},
        ).listen(
          (SSEModel event) {
            // Manejar nulos con el operador '!'
            final dataString = event.data ?? '{}';
            print(dataString);
            
            try {
              final jsonData = jsonDecode(dataString) as Map<String, dynamic>;
              events.add(jsonData);
            } catch (e) {
              print('Error parseando JSON SSE: $e');
            }
          },
          onError: (err) {
            print('Error SSE: $err');
          },
        );
  }

  void unsubscribeFromSSE() {
    _subscription?.cancel();
    SSEClient.unsubscribeFromSSE();
  }

  @override
  void onClose() {
    unsubscribeFromSSE();
    super.onClose();
  }
}
