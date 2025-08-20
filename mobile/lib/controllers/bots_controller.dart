import 'package:get/get.dart';

class BotsController extends GetxController {

  var bots = <Map<String, dynamic>>[
    {
      "name": "BTCUSDT",
      "description": "ID 0",
      "enabled": true.obs,
      "live": true.obs
    },
    {
      "name": "ADAUSDT",
      "description": "ID 1",
      "enabled": true.obs,
      "live": true.obs
    },
    {
      "name": "ETHUSDT",
      "description": "ID 2",
      "enabled": true.obs,
      "live": true.obs
    }
  ].obs;


  void agregarBot(Map<String, String> bot) {
    bots.add(bot);
  }

  void eliminarBot(int index) {
    bots.removeAt(index);
  }

  void updateBotStatus(Map<String, dynamic> bot, bool value) {
    bot["enabled"].value = value;
  }
}
