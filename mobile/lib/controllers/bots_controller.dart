import 'package:get/get.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

class BotsController extends GetxController {
  var bots = <Map<String, dynamic>>[].obs;
  Timer? _timer;

  @override
  void onInit() {
    super.onInit();
    startPolling();
  }

  @override
  void onClose() {
    _timer?.cancel();
    super.onClose();
  }

  void startPolling() {
    fetchBots(); 
    _timer = Timer.periodic(Duration(seconds: 5), (timer) {
      fetchBots();
    });
  }

  void stopPolling() {
    _timer?.cancel();
  }

  Future<void> fetchBots() async {
    try {
      final response = await http.get(
        Uri.parse('https://f678856d2f73.ngrok-free.app/api/query/get-slaves'),
        headers: {'Content-Type': 'application/json'},
      );

      print('Response status: ${response.statusCode}');


      if (response.statusCode == 200) {
        final Map<String, dynamic> jsonData = json.decode(response.body);

        if (jsonData['success'] == true) {
          bots.value = List<Map<String, dynamic>>.from(jsonData['data']);
          print('Bots loaded: ${bots.value}');
        }
      }
    } catch (e) {
      print('Error fetching bots: $e');
    }
  }
}
