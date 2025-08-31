import 'package:blacker/main.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

class AlertsController extends GetxController {
  final String baseUrl = dotenv.env['BASE_URL']!;

  static const _pollingInterval = Duration(seconds: 60);
  static const _requestTimeout = Duration(seconds: 30);

  final alerts = <Map<String, dynamic>>[].obs;
  final isLoading = false.obs;
  final error = Rxn<String>();

  Timer? _timer;
  bool get isPolling => _timer?.isActive ?? false;
  bool get hasError => error.value != null;
  bool get isEmpty => alerts.isEmpty && !isLoading.value;

  @override
  void onInit() {
    super.onInit();
    _initializeAlerts();
  }

  @override
  void onClose() {
    _stopPolling();
    alerts.clear();
    super.onClose();
  }

  Future<void> refresh() async {
    _stopPolling();
    await _fetchAlerts();
    _startPolling();
  }

  void pause() => _stopPolling();
  void resume() => _startPolling();

  Future<void> _initializeAlerts() async {
    await _fetchAlerts();
    _startPolling();
  }

  Future<void> _fetchAlerts() async {
    try {
      if (!isPolling) isLoading.value = true;
      error.value = null;

      final response = await http
          .get(Uri.parse('$baseUrl/api/query/get-alerts'))
          .timeout(_requestTimeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('Final data: ${data['data']}');

        if (data['success'] == true) {
          alerts.value = List<Map<String, dynamic>>.from(data['data'] ?? []);

          if (alerts.isNotEmpty) {
            await solicitarPermisoNotificaciones();
            await mostrarNotificacion(
              "New Alert",
              "You have new alerts",
            );
          }
        }
      }
    } catch (e) {
      error.value = 'Error loading alerts';
    } finally {
      isLoading.value = false;
    }
  }

  void _startPolling() {
    if (isPolling) return;
    _timer = Timer.periodic(_pollingInterval, (_) => _fetchAlerts());
  }

  void _stopPolling() {
    _timer?.cancel();
    _timer = null;
  }
}
