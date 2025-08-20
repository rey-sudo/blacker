import 'package:get/get.dart';

class BotsController extends GetxController {
  var bots = <Map<String, dynamic>>[
    {
      "id": "slave-0",
      "symbol": "BTCUSDT",
      "description": "Trading bot combining RSI, Squeeze, ADX, and Heikin-Ashi to detect clear trends, breakouts, and reliable signals, optimizing entries, exits, and risk management automatically.",
      "enabled": true.obs,
      "live": true.obs,
      "iteration": 53,
      "info": [
        {"title": "Runtime", "subtitle": "3d 8h 55m"},
        {"title": "Status", "subtitle": "Running"},
        {"title": "Rules", "subtitle": "3/4"},
        {"title": "Executed", "subtitle": "True"},
        {"title": "Finished", "subtitle": "False"},
        {"title": "Leverage", "subtitle": "5x"},
        {"title": "SL", "subtitle": "3%"},
        {"title": "Amount", "subtitle": "500 USD"},
        {"title": "Margin", "subtitle": "ISOLATED"},
      ],
    },
    {
      "id": "slave-1",
      "symbol": "ADAUSDT",
      "description": "Trading bot combining RSI, Squeeze, ADX, and Heikin-Ashi to detect clear trends, breakouts, and reliable signals, optimizing entries, exits, and risk management automatically.",
      "enabled": true.obs,
      "live": true.obs,
      "iteration": 24,
      "info": [
        {"title": "Runtime", "subtitle": "3d 8h 55m"},
        {"title": "Status", "subtitle": "Stopped"},
        {"title": "Rules", "subtitle": "3/4"},
        {"title": "Executed", "subtitle": "True"},
        {"title": "Finished", "subtitle": "False"},
        {"title": "Leverage", "subtitle": "5x"},
        {"title": "SL", "subtitle": "3%"},
        {"title": "Amount", "subtitle": "500 USD"},
        {"title": "Margin", "subtitle": "ISOLATED"},
      ],
    },
    {
      "id": "slave-2",
      "symbol": "ETHUSDT",
      "description": "Trading bot combining RSI, Squeeze, ADX, and Heikin-Ashi to detect clear trends, breakouts, and reliable signals, optimizing entries, exits, and risk management automatically.",
      "enabled": true.obs,
      "live": true.obs,
      "iteration": 17,
      "info": [
        {"title": "Runtime", "subtitle": "3d 8h 55m"},
        {"title": "Status", "subtitle": "Error"},
        {"title": "Rules", "subtitle": "3/4"},
        {"title": "Executed", "subtitle": "True"},
        {"title": "Finished", "subtitle": "False"},
        {"title": "Leverage", "subtitle": "5x"},
        {"title": "SL", "subtitle": "3%"},
        {"title": "Amount", "subtitle": "500 USD"},
        {"title": "Margin", "subtitle": "ISOLATED"},
      ],
    },
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
