import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

class BotsController extends GetxController {
  final String baseUrl = dotenv.env['BASE_URL']!;
  
  var bots = <Map<String, dynamic>>[].obs;
  var isLoading = true.obs;
  Timer? _timer;

  @override
  void onInit() {
    super.onInit();

    loadInitialData();
  }

  Future<void> loadInitialData() async {

    await fetchBots();

    isLoading.value = false;

    startPolling();
  }

  void startPolling() {
    _timer = Timer.periodic(Duration(seconds: 10), (timer) {
      fetchBots();
    });
  }

  @override
  void onClose() {
    _timer?.cancel();
    super.onClose();
  }

  void stopPolling() {
    _timer?.cancel();
  }

  Future<void> fetchBots() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/query/get-slaves'),
        headers: {'Content-Type': 'application/json'},
      );      

      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonData = json.decode(response.body);

        if (jsonData['success'] == true) {
          bots.value = List<Map<String, dynamic>>.from(jsonData['data']);
          print('Bots loaded: ${bots.length}');
        }
      }
    } catch (e) {
      print('Error fetching bots: $e');
    }
  }
}