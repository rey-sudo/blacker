import 'dart:async';
import 'dart:convert';
import 'package:flutter_client_sse/constants/sse_request_type_enum.dart';
import 'package:flutter_client_sse/flutter_client_sse.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get/get.dart';

class LogsController extends GetxController {
  final String baseUrl = dotenv.env['BASE_URL']!;
  
  var events = <Map<String, dynamic>>[].obs;
  StreamSubscription<SSEModel>? _subscription;

  void listen(String botId) {
    unsubscribeFromSSE();
    _subscription =
        SSEClient.subscribeToSSE(
          method: SSERequestType.GET,
          url: '$baseUrl/api/slave/$botId/get-logs',
          header: {"Accept": "text/event-stream", "Cache-Control": "no-cache"},
        ).listen(
          (SSEModel event) {
            final dataString = event.data ?? '{}';
            try {
              final jsonData = jsonDecode(dataString) as Map<String, dynamic>;
              events.add(jsonData);
              print("Logs added");
            } catch (e) {
              print('Error parseando JSON SSE: $e');
            }
          },
          onDone: () {
            print('SSE cerrado por el servidor.');
            _scheduleReconnect(botId);
          },
          onError: (err) {
            print('Error SSE: $err');
            _scheduleReconnect(botId);
          },
        );
  }

  void _scheduleReconnect(String botId) {
    Future.delayed(const Duration(seconds: 3), () {
      unsubscribeFromSSE();
      listen(botId);
    });
  }

  void unsubscribeFromSSE() {
    _subscription?.cancel();
    SSEClient.unsubscribeFromSSE();
    events.clear();
    print('SSE unsubscribed and cleared.');
  }

  @override
  void onClose() {
    unsubscribeFromSSE();
    super.onClose();
  }
}
