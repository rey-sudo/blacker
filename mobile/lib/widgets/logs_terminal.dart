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
  bool _showScrollButton = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_scrollListener);
  }

  void _scrollListener() {
    if (!_scrollController.hasClients) return;

    final atBottom =
        _scrollController.offset >=
        _scrollController.position.maxScrollExtent - 20;

    if (atBottom && _showScrollButton) {
      setState(() => _showScrollButton = false);
    } else if (!atBottom && !_showScrollButton) {
      setState(() => _showScrollButton = true);
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 50), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 600), 
          curve: Curves.easeInOut, 
        );
      }
    });
  }

  @override
  void dispose() {
    _scrollController.removeListener(_scrollListener);
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
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
              if (logString.contains('✅')) {
                textColor = Colors.greenAccent;
              } else if (logString.contains('🕒')) {
                textColor = Colors.orangeAccent;
              } else if (logString.contains('ready')) {
                textColor = Colors.blueAccent;
              }

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
        ),

        Positioned(
          bottom: 16,
          right: 16,
          child: AnimatedOpacity(
            opacity: _showScrollButton ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 300),
            child: IgnorePointer(
              ignoring: !_showScrollButton,
              child: FloatingActionButton(
                backgroundColor: Colors.black,
                shape: const CircleBorder(
                  side: BorderSide(
                    color: Colors.white,
                    width: 2,
                  ), 
                ),
                onPressed: _scrollToBottom,
                child: const Icon(Icons.arrow_downward, color: Colors.white),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
