import 'package:flutter/material.dart';
import 'dart:convert';

class LogsTerminal extends StatefulWidget {
  final List<Map<String, dynamic>> logs;

  const LogsTerminal({super.key, required this.logs});

  @override
  State<LogsTerminal> createState() => _LogsTerminalState();
}

class _LogsTerminalState extends State<LogsTerminal> {
  final ScrollController _scrollController = ScrollController();

  @override
  void didUpdateWidget(covariant LogsTerminal oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.logs.length != oldWidget.logs.length) {
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 50), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      padding: const EdgeInsets.all(4),
      child: ListView.builder(
        controller: _scrollController,
        itemCount: widget.logs.length,
        itemBuilder: (context, index) {
          final log = widget.logs[index];

          String logString;
          try {
            logString = const JsonEncoder.withIndent('  ').convert(log);
          } catch (e) {
            logString = log.toString();
          }


          Color textColor = Colors.white;
          if (logString.contains('✅')) textColor = Colors.greenAccent;
          else if (logString.contains('🕒')) textColor = Colors.orangeAccent;
          else if (logString.contains('ready')) textColor = Colors.blueAccent;

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Text(
              logString,
              style: TextStyle(
                fontFamily: 'monospace',
                fontSize: 14,
                color: textColor,
              ),
            ),
          );
        },
      ),
    );
  }
}
